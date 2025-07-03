import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({ default: 'defaultUsername' }) // Set your default value here
  @IsOptional()
  username: string = 'defaultUsername'; // Default value in code

  @ApiProperty({ default: 'defaultPassword' }) // Set your default value here
  @IsOptional()
  password: string = 'defaultPassword'; // Default value in code
}
