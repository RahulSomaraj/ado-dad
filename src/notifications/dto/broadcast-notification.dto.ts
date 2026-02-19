import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional } from 'class-validator';

export class BroadcastNotificationDto {
    @ApiProperty({
        description: 'The title of the notification',
        example: 'New Feature Alert 🚀'
    })
    @IsString()
    title: string;

    @ApiProperty({
        description: 'The body message of the notification',
        example: 'Check out the new features in our latest update!'
    })
    @IsString()
    body: string;

    @ApiProperty({
        description: 'Additional data payload (can be complex JSON)',
        type: Object,
        required: false,
        example: { type: 'global', screen: 'home', payload: { nested: true, key: 'value' } }
    })
    @IsObject()
    @IsOptional()
    data?: any;
}
