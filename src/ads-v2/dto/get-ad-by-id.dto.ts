import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { DetailedAdResponseDto } from '../../ads/dto/common/ad-response.dto';

/**
 * DTO for Get Advertisement by ID endpoint path parameter
 */
export class GetAdByIdParamDto {
  @ApiProperty({
    description:
      'Advertisement ID (MongoDB ObjectId - 24 character hex string)',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId({ message: 'Invalid MongoDB ObjectId format' })
  @IsNotEmpty({ message: 'Advertisement ID is required' })
  @IsString()
  id: string;
}

/**
 * Swagger decorators for Get Advertisement by ID endpoint
 */
export function GetAdByIdSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get advertisement by ID with complete details (v2)',
      description: `
      Retrieve a single advertisement by its ID with comprehensive details.
      
      **Authentication:**
      - **Optional**: No authentication required (public endpoint)
      - **With Bearer Token**: Provides personalized favorites and chat relations
      - **Without Token**: Shows isFavorite: false and no chat relations
      
      **Response includes:**
      - Complete advertisement information
      - User details (name, email, phone, profile picture)
      - Category-specific details (property, vehicle, commercial vehicle)
      - Vehicle inventory details (manufacturer, model, variant, transmission, fuel)
      - Chat relations (authenticated users only)
      - Engagement metrics (favorites count, view count)
      - Ratings and reviews (when available)
    `,
    }),
  );
}
