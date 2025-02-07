import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { AdvertisementsService } from './advertisement.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { UserRole } from '../roles/user-role.enum';
import { HttpExceptionFilter } from 'src/shared/exception-service';

@ApiTags('Advertisements')
@Controller('advertisements')
@UseFilters(new HttpExceptionFilter('Advertisements'))
export class AdvertisementsController {
  constructor(private readonly advertisementService: AdvertisementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new advertisement' })
  @ApiResponse({
    status: 201,
    description: 'Advertisement created successfully.',
  })
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.Admin, UserRole.Vendor, UserRole.User)
  async create(@Body() createAdvertisementDto: CreateAdvertisementDto) {
    return this.advertisementService.create(createAdvertisementDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all advertisements with optional filters' })
  @ApiResponse({ status: 200, description: 'List of advertisements' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by advertisement category',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by location',
  })
  @ApiQuery({
    name: 'priceMin',
    required: false,
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'priceMax',
    required: false,
    description: 'Maximum price filter',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by advertisement status (active, expired, etc.)',
  })
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
    description: 'Sort by field (e.g., price:asc, date:desc)',
  })
  async findAll(
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('priceMin') priceMin?: number,
    @Query('priceMax') priceMax?: number,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sort') sort?: string,
  ) {
    const pagination = {
      page: parseInt(page.toString(), 10),
      limit: parseInt(limit.toString(), 10),
    };

    const sortOptions = sort
      ? Object.fromEntries(sort.split(',').map((s) => s.split(':')))
      : {};

    return this.advertisementService.findAll({
      category,
      location,
      priceMin,
      priceMax,
      status,
      pagination,
      sortOptions,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get advertisement by ID' })
  @ApiResponse({ status: 200, description: 'Advertisement found.' })
  async findOne(@Param('id') id: string) {
    return this.advertisementService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update advertisement by ID' })
  @ApiResponse({
    status: 200,
    description: 'Advertisement updated successfully.',
  })
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin, UserRole.Vendor, UserRole.User)
  async update(
    @Param('id') id: string,
    @Body() updateAdvertisementDto: UpdateAdvertisementDto,
  ) {
    return this.advertisementService.update(id, updateAdvertisementDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete advertisement by ID' })
  @ApiResponse({
    status: 200,
    description: 'Advertisement deleted successfully.',
  })
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  async remove(@Param('id') id: string) {
    return this.advertisementService.remove(id);
  }
}
