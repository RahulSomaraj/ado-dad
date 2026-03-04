import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateAppVersionDto {
    @ApiPropertyOptional({ example: '1.2.0', description: 'Latest iOS version' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    iosLatestVersion?: string;

    @ApiPropertyOptional({ example: '1.2.0', description: 'Latest Android version' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    androidLatestVersion?: string;

    @ApiPropertyOptional({ example: 'https://apps.apple.com/app/id123456' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @IsUrl()
    iosStoreUrl?: string;

    @ApiPropertyOptional({ example: 'https://play.google.com/store/apps/details?id=com.daycationpass.app' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @IsUrl()
    androidStoreUrl?: string;

    @ApiPropertyOptional({ example: false, description: 'Force update for all users' })
    @IsOptional()
    @IsBoolean()
    forceUpdate?: boolean;
}
