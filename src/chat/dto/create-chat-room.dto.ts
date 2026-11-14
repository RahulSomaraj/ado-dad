import { IsNotEmpty, IsString } from 'class-validator';

export class CreateChatRoomDto {
  @IsString()
  @IsNotEmpty()
  adId: string;
}
