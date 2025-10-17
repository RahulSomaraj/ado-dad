import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description: 'Username (email, phone, or name)',
    example: '1212121212',
    default: '1212121212',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Password',
    example: 'Akhila@111',
    default: 'Akhila@111',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password: string;
}
