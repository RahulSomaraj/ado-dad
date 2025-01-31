import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class AdditionalInfoDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  abs: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  accidental: boolean;

  @ApiProperty({ example: 'Red' })
  @IsString()
  color: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  powerSteering: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  powerWindows: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  sunroof: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  usbCompatibility: boolean;

  @ApiProperty({ example: 'Comprehensive' })
  @IsString()
  insuranceType: string;
}
