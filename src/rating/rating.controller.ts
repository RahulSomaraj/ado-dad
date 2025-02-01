import { Controller, Post, Put, Get, Param, Body, Query, Delete } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiQuery } from '@nestjs/swagger';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { RatingService } from './rating.service';
import { Roles } from 'src/roles/roles.decorator'; // Assuming you have a Roles decorator
import { UserRole } from 'src/roles/user-role.enum'; // Assuming you have a Role enum

@ApiTags('Ratings')
@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new rating' })
  @ApiBody({
    description: 'Create a new rating for a product',
    type: CreateRatingDto,
    examples: {
      'application/json': {
        value: {
          user: '63a79bfb1234567890abcdef',
          product: '63b1c1234567890abcdef123',
          rating: 4,
          review: 'This product is excellent!',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Rating created successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @Roles(UserRole.User, UserRole.Admin) // Assuming you have a roles mechanism
  async createRating(@Body() createRatingDto: CreateRatingDto) {
    return this.ratingService.create(createRatingDto);
  }

  @Put(':ratingId')
  @ApiOperation({ summary: 'Update a specific rating' })
  @ApiBody({
    description: 'Update a specific rating',
    type: UpdateRatingDto,
    examples: {
      'application/json': {
        value: {
          rating: 5,
          review: 'Updated review for the product.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Rating updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Rating not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @Roles(UserRole.Admin) // Only admin can update
  async updateRating(@Param('ratingId') ratingId: string, @Body() updateRatingDto: UpdateRatingDto) {
    return this.ratingService.update(ratingId, updateRatingDto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get ratings for a product' })
  @ApiQuery({
    name: 'minRating',
    required: false,
    description: 'Filter ratings with a minimum rating',
    type: Number,
  })
  @ApiQuery({
    name: 'maxRating',
    required: false,
    description: 'Filter ratings with a maximum rating',
    type: Number,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Pagination: Page number',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Pagination: Number of items per page',
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Ratings fetched successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async getRatingsByProduct(
    @Param('productId') productId: string,
    @Query() query: any,
  ) {
    return this.ratingService.getRatingsByProduct(productId, query);
  }

  @Delete(':ratingId')
  @ApiOperation({ summary: 'Delete a specific rating' })
  @ApiResponse({
    status: 200,
    description: 'Rating deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Rating not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @Roles(UserRole.Admin) // Only admin can delete
  async deleteRating(@Param('ratingId') ratingId: string) {
    return this.ratingService.delete(ratingId);
  }
}
