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
} from '@nestjs/common';
import { ShowroomService } from './showroom.service';
import { Showroom } from './schemas/showroom.schema';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CreateShowroomDto } from './dto/create-showroom.dto';
import { UpdateShowroomDto } from './dto/update-showroom.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';

@ApiTags('Showrooms')
@Controller('showrooms')
export class ShowroomController {
  constructor(private readonly showroomService: ShowroomService) {}

  @Get()
  @ApiOperation({ summary: 'Get all showrooms with optional query filters' })
  @ApiResponse({ status: 200, description: 'List of all showrooms' })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by location',
  })
  @ApiQuery({ name: 'brand', required: false, description: 'Filter by brand' })
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
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort by field (e.g., name:asc, location:desc)',
  })
  async getShowrooms(
    @Query('location') location?: string,
    @Query('brand') brand?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sort') sort?: string,
  ): Promise<Showroom[]> {
    const pagination = {
      page: parseInt(page.toString(), 10),
      limit: parseInt(limit.toString(), 10),
    };

    const sortOptions = sort
      ? Object.fromEntries(sort.split(',').map((s) => s.split(':')))
      : {};

    return this.showroomService.getShowrooms({
      location,
      brand,
      pagination,
      sortOptions,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a showroom by ID' })
  @ApiResponse({ status: 200, description: 'Showroom details' })
  async getShowroomById(@Param('id') id: string): Promise<Showroom> {
    return this.showroomService.getShowroomById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add a new showroom' })
  @ApiResponse({
    status: 201,
    description: 'Showroom added successfully',
    type: Showroom,
  })
  async addShowroom(
    @Body() createShowroomDto: CreateShowroomDto,
  ): Promise<Showroom> {
    return this.showroomService.addShowroom(createShowroomDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a showroom' })
  @ApiResponse({
    status: 200,
    description: 'Showroom updated successfully',
    type: Showroom,
  })
  async updateShowroom(
    @Param('id') id: string,
    @Body() updateShowroomDto: UpdateShowroomDto,
  ): Promise<Showroom> {
    return this.showroomService.updateShowroom(id, updateShowroomDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a showroom' })
  @ApiResponse({ status: 200, description: 'Showroom deleted successfully' })
  async deleteShowroom(@Param('id') id: string): Promise<void> {
    return this.showroomService.deleteShowroom(id);
  }
}
