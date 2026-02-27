import {
  IsIn,
  IsNotEmpty,
  IsString,
  Length,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
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
  @IsOptional()
  mimeType?: string;

  @IsNumber()
  @IsOptional()
  size?: number;

  @IsNumber()
  @IsOptional()
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
