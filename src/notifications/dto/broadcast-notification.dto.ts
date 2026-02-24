import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, IsEnum, IsArray, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum TargetType {
    ALL = 'ALL',
    TOPIC = 'TOPIC',
    TOKENS = 'TOKENS',
}

export enum MediaType {
    NONE = 'NONE',
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO',
    AUDIO = 'AUDIO',
}

export enum NotificationPriority {
    HIGH = 'HIGH',
    NORMAL = 'NORMAL',
}

export class MediaDto {
    @ApiProperty({ enum: MediaType, example: MediaType.IMAGE })
    @IsEnum(MediaType)
    type: MediaType;

    @ApiProperty({ description: 'URL of the media asset', example: 'https://azureblob.com/sale.jpg' })
    @IsUrl()
    url: string;

    @ApiPropertyOptional({ description: 'Thumbnail URL for video/audio', example: 'https://azureblob.com/thumb.jpg' })
    @IsUrl()
    @IsOptional()
    thumbnail?: string;
}

export class NotificationDataDto {
    @ApiPropertyOptional({ description: 'Application specific data type', example: 'sale' })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiPropertyOptional({ description: 'Screen name to navigate to', example: 'offer_details' })
    @IsString()
    @IsOptional()
    screen?: string;

    @ApiPropertyOptional({ description: 'Entity ID for the screen context', example: '99' })
    @IsString()
    @IsOptional()
    entityId?: string;

    @ApiPropertyOptional({ description: 'Additional extra data', type: Object })
    @IsObject()
    @IsOptional()
    extra?: Record<string, any>;

    // Allow dynamic fields directly in data
    [key: string]: any;
}

export class BroadcastNotificationDto {
    @ApiProperty({ description: 'The title of the notification', example: 'Flash Sale 🔥' })
    @IsString()
    title: string;

    @ApiProperty({ description: 'The body message of the notification', example: 'Flat 45% OFF today only!' })
    @IsString()
    body: string;

    @ApiPropertyOptional({ enum: TargetType, example: TargetType.ALL, default: TargetType.ALL })
    @IsEnum(TargetType)
    @IsOptional()
    targetType?: TargetType = TargetType.ALL;

    @ApiPropertyOptional({ description: 'Topic name if targetType is TOPIC', example: 'news' })
    @IsString()
    @IsOptional()
    topic?: string;

    @ApiPropertyOptional({ description: 'List of tokens if targetType is TOKENS', type: [String] })
    @IsArray()
    @IsOptional()
    tokens?: string[];

    @ApiPropertyOptional({ enum: NotificationPriority, example: NotificationPriority.HIGH })
    @IsEnum(NotificationPriority)
    @IsOptional()
    priority?: NotificationPriority = NotificationPriority.NORMAL;

    @ApiPropertyOptional({ type: MediaDto })
    @ValidateNested()
    @Type(() => MediaDto)
    @IsOptional()
    media?: MediaDto;

    @ApiPropertyOptional({ type: NotificationDataDto })
    @ValidateNested()
    @Type(() => NotificationDataDto)
    @IsOptional()
    data?: NotificationDataDto;
}
