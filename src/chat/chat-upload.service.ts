import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from '../shared/s3.service';
import { ChatError, ChatErrorCode } from './chat-errors';
import { CreateChatUploadDto } from './dto/chat-query.dto';

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

const AUDIO_TYPES: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/3gpp': '3gp',
};

export const CHAT_UPLOAD_LIMITS = { image: 10 * 1024 * 1024, audio: 5 * 1024 * 1024 };
const PRESIGN_TTL_SECONDS = 300;

export interface ChatUploadTicket {
  uploadUrl: string;
  method: 'PUT';
  /** Send these headers verbatim — the signature covers Content-Type. */
  headers: Record<string, string>;
  /** Use this as `attachments[].url` in the message. */
  url: string;
  key: string;
  expiresIn: number;
}

@Injectable()
export class ChatUploadService {
  constructor(private readonly s3: S3Service) {}

  /** Caller must already have verified the user is a participant of `roomId`. */
  async createTicket(roomId: string, dto: CreateChatUploadDto): Promise<ChatUploadTicket> {
    const mimeType = dto.mimeType.toLowerCase().trim();
    const table = dto.kind === 'image' ? IMAGE_TYPES : AUDIO_TYPES;
    const ext = table[mimeType];
    if (!ext) {
      throw new ChatError(ChatErrorCode.ATTACHMENT_INVALID, `Unsupported ${dto.kind} type: ${mimeType}`);
    }
    const limit = CHAT_UPLOAD_LIMITS[dto.kind];
    if (dto.size > limit) {
      throw new ChatError(
        ChatErrorCode.ATTACHMENT_INVALID,
        `File is too large (max ${Math.round(limit / 1024 / 1024)} MB)`,
      );
    }

    // m4a variants are stored as audio/mp4 so every player recognises them.
    const contentType = dto.kind === 'audio' && ext === 'm4a' ? 'audio/mp4' : mimeType;
    const safeRoom = roomId.replace(/[^A-Za-z0-9_-]/g, '');
    const key = `chat/${safeRoom}/${uuidv4()}.${ext}`;
    const uploadUrl = await this.s3.getPresignedPutUrlForKey(key, contentType, PRESIGN_TTL_SECONDS);

    return {
      uploadUrl,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      url: this.s3.getPublicUrl(key),
      key,
      expiresIn: PRESIGN_TTL_SECONDS,
    };
  }
}
