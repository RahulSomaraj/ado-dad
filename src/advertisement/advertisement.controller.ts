import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseFilters,
} from '@nestjs/common';
import { AdvertisementsService } from './advertisement.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/shared/exception-service';

@ApiTags('Advertisements')
@Controller('advertisements')
@UseFilters(new HttpExceptionFilter('Advertisements'))
export class AdvertisementsController {
  constructor(private readonly advertisementService: AdvertisementsService) {}

  // ✅ Create a new advertisement
  @Post()
  @ApiOperation({ summary: 'Create a new advertisement' })
  @ApiResponse({
    status: 201,
    description: 'Advertisement created successfully.',
  })
  async create(
    @Body() createAdvertisementDto: CreateAdvertisementDto,
    @Query('userId') userId: string,
  ) {
    return this.advertisementService.create(createAdvertisementDto, userId);
  }

  // ✅ Get all advertisements with filters & pagination
  @Get()
  @ApiOperation({ summary: 'Get all advertisements with optional filters' })
  @ApiResponse({ status: 200, description: 'List of advertisements' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by advertisement type (Vehicle/Property)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by property category' })
  @ApiQuery({ name: 'propertyType', required: false, description: 'Filter by property type' })
  @ApiQuery({ name: 'brandName', required: false, description: 'Filter by vehicle brand name' })
  @ApiQuery({ name: 'minPrice', required: false, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, description: 'Maximum price filter' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by field (e.g., price, createdAt)' })
  @ApiQuery({ name: 'order', required: false, description: 'Sort order (asc/desc)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  async findAll(
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('propertyType') propertyType?: string,
    @Query('brandName') brandName?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('order') order: string = 'desc',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.advertisementService.findAll({
      type,
      category,
      propertyType,
      brandName,
      minPrice,
      maxPrice,
      sortBy,
      order,
      page,
      limit,
    });
  }

  // ✅ Get advertisement by ID
  @Get(':id')
  @ApiOperation({ summary: 'Get advertisement by ID' })
  @ApiResponse({ status: 200, description: 'Advertisement found.' })
  async findOne(@Param('id') id: string) {
    return this.advertisementService.findOne(id);
  }

  // ✅ Update advertisement by ID
  @Put(':id')
  @ApiOperation({ summary: 'Update advertisement by ID' })
  @ApiResponse({ status: 200, description: 'Advertisement updated successfully.' })
  async update(
    @Param('id') id: string,
    @Body() updateAdvertisementDto: UpdateAdvertisementDto,
    @Query('userId') userId: string,
  ) {
    return this.advertisementService.update(id, updateAdvertisementDto, userId);
  }

  // ✅ Delete advertisement by ID
  @Delete(':id')
  @ApiOperation({ summary: 'Delete advertisement by ID' })
  @ApiResponse({ status: 200, description: 'Advertisement deleted successfully.' })
  async remove(@Param('id') id: string, @Query('userId') userId: string,) {
    return this.advertisementService.remove(id,userId);
  }
}
