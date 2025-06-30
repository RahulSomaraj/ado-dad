import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  chat: string;

  @IsString()
  @IsNotEmpty()
  content: string;
} 