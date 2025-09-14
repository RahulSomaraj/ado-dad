import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  UseFilters,
} from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { HttpExceptionFilter } from '../shared/exception-service';
import { UserType } from '../users/enums/user.types';

@ApiTags('Favorites')
@ApiBearerAuth()
@Controller('favorites')
@UseFilters(new HttpExceptionFilter('Favorites'))
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post()
  @ApiOperation({
    summary: 'Toggle ad favorite status',
    description:
      'Adds the ad to favorites if not favorited, removes it if already favorited. Returns the new favorite status.',
  })
  @ApiBody({ type: CreateFavoriteDto })
  async addFavorite(@Req() req, @Body() createFavoriteDto: CreateFavoriteDto) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return this.favoriteService.addFavorite(userId, createFavoriteDto);
  }

  @Get()
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN, UserType.USER, UserType.SHOWROOM)
  @ApiOperation({
    summary: "Get user's favorite ads with detailed information",
    description:
      'Returns paginated list of user favorites with detailed ad information including user details, vehicle inventory, etc.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'itemId',
    required: false,
    type: String,
    description: 'Filter by specific item ID',
  })
  async getUserFavorites(@Req() req, @Query() query) {
    // Get user ID from JWT token
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return await this.favoriteService.getUserFavorites(userId, query);
  }

  @Get(':favoriteId')
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN, UserType.USER, UserType.SHOWROOM)
  @ApiOperation({
    summary: 'Get a specific favorite by ID with detailed information',
    description:
      'Returns detailed ad information for a specific favorite including user details, vehicle inventory, etc.',
  })
  @ApiParam({
    name: 'favoriteId',
    type: String,
    description: 'MongoDB ObjectId of the favorite',
  })
  async getFavoriteById(@Req() req, @Param('favoriteId') favoriteId: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return await this.favoriteService.getFavoriteById(userId, favoriteId);
  }

  @Put(':favoriteId')
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN, UserType.USER, UserType.SHOWROOM)
  @ApiOperation({ summary: 'Update a favorite' })
  @ApiParam({ name: 'favoriteId', type: String })
  @ApiBody({ type: UpdateFavoriteDto })
  async updateFavorite(
    @Req() req,
    @Param('favoriteId') favoriteId: string,
    @Body() updateFavoriteDto: UpdateFavoriteDto,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return await this.favoriteService.updateFavorite(
      userId,
      favoriteId,
      updateFavoriteDto,
    );
  }

  @Delete(':favoriteId')
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN, UserType.USER, UserType.SHOWROOM)
  @ApiOperation({ summary: 'Remove an item from favorites' })
  @ApiParam({ name: 'favoriteId', type: String })
  async removeFavorite(@Req() req, @Param('favoriteId') favoriteId: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return await this.favoriteService.removeFavorite(userId, favoriteId);
  }

  @Post('toggle/:adId')
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN, UserType.USER, UserType.SHOWROOM)
  @ApiOperation({
    summary: 'Toggle favorite status for an ad',
    description:
      'Adds the ad to favorites if not favorited, removes it if already favorited. Returns the new favorite status.',
  })
  @ApiParam({
    name: 'adId',
    type: String,
    description: 'MongoDB ObjectId of the ad to toggle favorite status',
    example: '65b90e8f5d9f6c001c5a1234',
  })
  async toggleFavorite(@Req() req, @Param('adId') adId: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return await this.favoriteService.toggleFavorite(userId, adId);
  }

  @Get('count/total')
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN, UserType.USER, UserType.SHOWROOM)
  @ApiOperation({
    summary: "Get user's total favorites count",
    description:
      'Returns the total number of ads favorited by the current user',
  })
  async getFavoritesCount(@Req() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    const count = await this.favoriteService.getFavoritesCount(userId);
    return count;
  }
}
