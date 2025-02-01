import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseFilters } from '@nestjs/common';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Banner } from './schemas/schema.banner';
import { HttpExceptionFilter } from 'src/shared/exception-service';

@ApiTags('Banners')
@Controller('banners')
@UseFilters(new HttpExceptionFilter('Banners'))
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new banner' })
  @ApiResponse({ status: 201, description: 'Banner created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async create(@Body() createBannerDto: CreateBannerDto): Promise<Banner> {
    return this.bannerService.create(createBannerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all banners' })
  @ApiQuery({ name: 'title', required: false, description: 'Filter by title' })
  async findAll(@Query('title') title?: string): Promise<Banner[]> {
    return this.bannerService.findAll(title);
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
  async update(@Param('id') id: string, @Body() updateBannerDto: UpdateBannerDto): Promise<Banner> {
    return this.bannerService.update(id, updateBannerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a banner' })
  @ApiResponse({ status: 200, description: 'Banner deleted successfully' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.bannerService.remove(id);
  }
}
