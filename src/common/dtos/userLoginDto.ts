import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({ default: '1212121212' }) // Set your default value here
  @IsOptional()
  phone: string = '1212121212'; // Default value in code

  @ApiProperty({ default: '123456' }) // Set your default value here
  @IsOptional()
  password: string = '123456'; // Default value in code
}
