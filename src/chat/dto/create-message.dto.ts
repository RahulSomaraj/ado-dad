import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  chat: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;
}
