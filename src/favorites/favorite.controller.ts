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
@UseGuards(RolesGuard)
@Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN) // Assuming you have a roles mechanism
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
    return this.favoriteService.addFavorite(req.user.id, createFavoriteDto);
  }

  @Get()
  @Roles(UserType.USER, UserType.ADMIN)
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
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by ad category',
  })
  @ApiQuery({
    name: 'itemId',
    required: false,
    type: String,
    description: 'Filter by specific item ID',
  })
  @ApiQuery({
    name: 'itemType',
    required: false,
    enum: ['ad'],
    description: 'Filter by item type',
  })
  async getUserFavorites(@Req() req, @Query() query) {
    return await this.favoriteService.getUserFavorites(req.user.id, query);
  }

  @Get(':favoriteId')
  @Roles(UserType.USER, UserType.ADMIN)
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
    return await this.favoriteService.getFavoriteById(req.user.id, favoriteId);
  }

  @Put(':favoriteId')
  @Roles(UserType.USER)
  @ApiOperation({ summary: 'Update a favorite' })
  @ApiParam({ name: 'favoriteId', type: String })
  @ApiBody({ type: UpdateFavoriteDto })
  async updateFavorite(
    @Req() req,
    @Param('favoriteId') favoriteId: string,
    @Body() updateFavoriteDto: UpdateFavoriteDto,
  ) {
    return await this.favoriteService.updateFavorite(
      req.user.id,
      favoriteId,
      updateFavoriteDto,
    );
  }

  @Delete(':favoriteId')
  @Roles(UserType.USER)
  @ApiOperation({ summary: 'Remove an item from favorites' })
  @ApiParam({ name: 'favoriteId', type: String })
  async removeFavorite(@Req() req, @Param('favoriteId') favoriteId: string) {
    return await this.favoriteService.removeFavorite(req.user.id, favoriteId);
  }

  @Post('toggle/:adId')
  @Roles(UserType.USER, UserType.SHOWROOM)
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
    return await this.favoriteService.toggleFavorite(req.user.id, adId);
  }

  @Get('count/total')
  @Roles(UserType.USER, UserType.SHOWROOM)
  @ApiOperation({
    summary: "Get user's total favorites count",
    description:
      'Returns the total number of ads favorited by the current user',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by ad category',
  })
  async getFavoritesCount(@Req() req, @Query() query: any) {
    const count = await this.favoriteService.getFavoritesCount(
      req.user.id,
      query,
    );
    return count;
  }
}
