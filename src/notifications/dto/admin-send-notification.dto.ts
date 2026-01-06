import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsEnum, IsObject } from 'class-validator';

export class AdminSendNotificationDto {
    @ApiProperty({
        description: 'The target for the notification',
        enum: ['USER', 'USERS', 'ALL'],
        example: 'USER'
    })
    @IsEnum(['USER', 'USERS', 'ALL'])
    targetType: 'USER' | 'USERS' | 'ALL';

    @ApiProperty({
        description: 'List of user IDs to send notification to (required for USER and USERS)',
        type: [String],
        required: false,
        example: ['68b43b35bb6ed35ba4cf1bdf']
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    userIds?: string[];

    @ApiProperty({
        description: 'The title of the notification',
        example: 'Special Offer'
    })
    @IsString()
    title: string;

    @ApiProperty({
        description: 'The body/message of the notification',
        example: 'Click here to see our new car collection!'
    })
    @IsString()
    message: string;

    @ApiProperty({
        description: 'Optional structured data for the message',
        type: Object,
        required: false,
        example: { screen: 'offers', offerId: '123' }
    })
    @IsObject()
    @IsOptional()
    data?: Record<string, any>;
}
