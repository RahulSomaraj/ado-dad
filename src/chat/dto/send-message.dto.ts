import {
  IsIn,
  IsNotEmpty,
  IsString,
  Length,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { MessageType } from '../schemas/chat-message.schema';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 1000, {
    message: 'Message content must be between 1 and 1000 characters',
  })
  content: string;

  @IsEnum(MessageType, { message: 'Invalid message type' })
  @IsOptional()
  type: MessageType = MessageType.TEXT;
}
