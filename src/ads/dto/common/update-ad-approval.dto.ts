import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateAdApprovalDto {
    @ApiProperty({
        description: 'Approval status (true to approve, false to reject)',
        example: true,
        type: Boolean,
    })
    @IsBoolean()
    @IsNotEmpty()
    isApproved: boolean;
}
