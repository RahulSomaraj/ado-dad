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
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../schemas/chat-message.schema';

export class AttachmentDto {
  @IsEnum(['image', 'audio', 'file'])
  type: 'image' | 'audio' | 'file';

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsNumber()
  @IsNotEmpty()
  size: number;

  @IsOptional()
  @IsNumber()
  @Max(180) // Max 180 seconds (3 minutes)
  duration?: number;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsOptional()
  @Length(1, 1000, {
    message: 'Message content must be between 1 and 1000 characters',
  })
  content?: string;

  @IsEnum(MessageType, { message: 'Invalid message type' })
  @IsOptional()
  type: MessageType = MessageType.TEXT;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
