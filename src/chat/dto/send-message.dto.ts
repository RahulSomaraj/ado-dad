import {
  IsNotEmpty,
  IsString,
  Length,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Max,
  Min,
  ArrayMaxSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../schemas/chat-message.schema';

export class AttachmentDto {
  @IsEnum(['image', 'audio', 'file'])
  type: 'image' | 'audio' | 'file';

  @IsString()
  @IsNotEmpty()
  @Length(1, 2048)
  url: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsNumber()
  @Min(1)
  size: number;

  /** Seconds. Required for new clients sending audio; legacy clients may omit it. */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(180)
  duration?: number;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;
}

/** Body shared by REST `POST /chats/rooms/:roomId/messages` and the socket event. */
export class SendMessageBodyDto {
  /** 8–64 chars of [A-Za-z0-9_-]; the same id always resolves to the same stored message. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{8,64}$/, { message: 'clientMessageId must be 8-64 url-safe characters' })
  clientMessageId?: string;

  @IsString()
  @IsOptional()
  @Length(1, 1000, { message: 'Message content must be between 1 and 1000 characters' })
  content?: string;

  @IsEnum(MessageType, { message: 'Invalid message type' })
  @IsOptional()
  type: MessageType = MessageType.TEXT;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

/** Socket `sendMessage` payload (legacy shape: roomId inside the body). */
export class SendMessageDto extends SendMessageBodyDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}
