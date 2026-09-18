import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    Min,
} from 'class-validator';

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

    @ApiPropertyOptional({ example: 'https://play.google.com/store/apps/details?id=com.adodad.user' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @IsUrl()
    androidStoreUrl?: string;

    @ApiPropertyOptional({
        example: false,
        description: 'Legacy: force update for builds that do not read build numbers',
    })
    @IsOptional()
    @IsBoolean()
    forceUpdate?: boolean;

    @ApiPropertyOptional({ example: 12, description: 'Newest Android versionCode live on Play (soft prompt below this)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    androidLatestBuild?: number;

    @ApiPropertyOptional({ example: 12, description: 'Newest iOS build number live on the App Store (soft prompt below this)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    iosLatestBuild?: number;

    @ApiPropertyOptional({ example: 9, description: 'Oldest Android versionCode still allowed (forced update below this)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    androidMinSupportedBuild?: number;

    @ApiPropertyOptional({ example: 9, description: 'Oldest iOS build number still allowed (forced update below this)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    iosMinSupportedBuild?: number;

    @ApiPropertyOptional({ example: 'Faster chat and bug fixes.', description: 'Shown in the update dialog' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    releaseNotes?: string;
}
