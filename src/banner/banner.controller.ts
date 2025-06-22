import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseFilters,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Banner } from './schemas/schema.banner';
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { UserType } from 'src/users/enums/user.types';

@ApiTags('Banners')
@Controller('banners')
@UseFilters(new HttpExceptionFilter('Banners'))
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new banner' })
  @ApiResponse({ status: 201, description: 'Banner created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async create(
    @Body() createBannerDto: CreateBannerDto,
    @Request() req,
  ): Promise<Banner> {
    const { user } = req;
    return this.bannerService.create(createBannerDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all banners with pagination' })
  @ApiQuery({ name: 'title', required: false, description: 'Filter by title' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  async findAll(
    @Query('title') title?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{ banners: Banner[]; totalPages: number; currentPage: number }> {
    return this.bannerService.findAll(title, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a banner by ID' })
  @ApiResponse({ status: 200, description: 'Banner found' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async findOne(@Param('id') id: string): Promise<Banner> {
    return this.bannerService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a banner' })
  @ApiResponse({ status: 200, description: 'Banner updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
    @Request() req,
  ): Promise<Banner> {
    const { user } = req;
    return this.bannerService.update(id, updateBannerDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a banner' })
  @ApiResponse({ status: 200, description: 'Banner deleted successfully' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    const { user } = req;
    return this.bannerService.remove(id, user);
  }
}
