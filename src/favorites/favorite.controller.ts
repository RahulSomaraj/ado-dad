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
@Roles(UserType.SHOWROOM, UserType.USER, UserType.SHOWROOM) // Assuming you have a roles mechanism
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post()
  async addToCart(
    @Query('userId') userId: string,
    @Body() createFavoriteDto: CreateFavoriteDto,
  ) {
    return this.favoriteService.addFavorite(userId, createFavoriteDto);
  }

  @Get()
  @Roles(UserType.USER, UserType.ADMIN)
  @ApiOperation({ summary: "Get user's favorites" })
  @ApiQuery({ name: 'itemId', required: false, type: String })
  @ApiQuery({ name: 'itemType', required: false, enum: ['product', 'service'] })
  async getUserFavorites(@Req() req, @Query() query) {
    return await this.favoriteService.getUserFavorites(req.user.id, query);
  }

  @Get(':favoriteId')
  @Roles(UserType.USER, UserType.ADMIN)
  @ApiOperation({ summary: 'Get a specific favorite by ID' })
  @ApiParam({ name: 'favoriteId', type: String })
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
}
