import { ApiProperty } from '@nestjs/swagger';

export class FcmResponseDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ example: 'Token registered successfully' })
    message: string;
}
