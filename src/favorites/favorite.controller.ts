import { 
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req 
} from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { UserRole } from 'src/roles/user-role.enum';
import { 
  ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody 
} from '@nestjs/swagger';

@ApiTags('Favorites')
@ApiBearerAuth()
@Controller('favorites')
@UseGuards(RolesGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post()
  @Roles(UserRole.User)
  @ApiOperation({ summary: 'Add an item to favorites' })
  @ApiBody({ type: CreateFavoriteDto })
  async addFavorite(@Req() req, @Body() createFavoriteDto: CreateFavoriteDto) {
    return await this.favoriteService.addFavorite(req.user.id, createFavoriteDto);
  }

  @Get()
  @Roles(UserRole.User, UserRole.Admin)
  @ApiOperation({ summary: 'Get user\'s favorites' })
  @ApiQuery({ name: 'itemId', required: false, type: String })
  @ApiQuery({ name: 'itemType', required: false, enum: ['product', 'service'] })
  async getUserFavorites(@Req() req, @Query() query) {
    return await this.favoriteService.getUserFavorites(req.user.id, query);
  }

  @Get(':favoriteId')
  @Roles(UserRole.User, UserRole.Admin)
  @ApiOperation({ summary: 'Get a specific favorite by ID' })
  @ApiParam({ name: 'favoriteId', type: String })
  async getFavoriteById(@Req() req, @Param('favoriteId') favoriteId: string) {
    return await this.favoriteService.getFavoriteById(req.user.id, favoriteId);
  }

  @Put(':favoriteId')
  @Roles(UserRole.User)
  @ApiOperation({ summary: 'Update a favorite' })
  @ApiParam({ name: 'favoriteId', type: String })
  @ApiBody({ type: UpdateFavoriteDto })
  async updateFavorite(
    @Req() req,
    @Param('favoriteId') favoriteId: string,
    @Body() updateFavoriteDto: UpdateFavoriteDto,
  ) {
    return await this.favoriteService.updateFavorite(req.user.id, favoriteId, updateFavoriteDto);
  }

  @Delete(':favoriteId')
  @Roles(UserRole.User)
  @ApiOperation({ summary: 'Remove an item from favorites' })
  @ApiParam({ name: 'favoriteId', type: String })
  async removeFavorite(@Req() req, @Param('favoriteId') favoriteId: string) {
    return await this.favoriteService.removeFavorite(req.user.id, favoriteId);
  }
}
