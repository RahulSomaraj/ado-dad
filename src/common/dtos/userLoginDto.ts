import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description: 'Username (email, phone, or name)',
    example: 'user@example.com',
    default: '1212121212',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Password',
    example: '123456',
    default: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password: string;
}
