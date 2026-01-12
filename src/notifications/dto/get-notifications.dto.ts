import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsMongoId } from 'class-validator';
import { PaginationDto } from '../../shared/dto/pagination.dto';

export class GetNotificationsDto extends PaginationDto {
    @ApiPropertyOptional({
        description: 'Filter by Notification ID',
        example: '6964c86c331e04c274c6f0a6',
    })
    @IsOptional()
    @IsString()
    @IsMongoId()
    _id?: string;
}
