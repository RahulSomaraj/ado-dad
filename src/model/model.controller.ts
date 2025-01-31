import { Controller, Post, Put, Get, Param, Body, Query, Delete } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiQuery } from '@nestjs/swagger';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { ModelService } from './model.service';

@ApiTags('Model')
@Controller('models')
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new model' })
  @ApiBody({
    description: 'Create a new vehicle model',
    type: CreateModelDto,
  })
  @ApiResponse({ status: 201, description: 'Model created successfully' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async createModel(@Body() createModelDto: CreateModelDto) {
    return this.modelService.create(createModelDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all models with optional query filters' })
  @ApiResponse({ status: 200, description: 'Models fetched successfully' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiQuery({ name: 'brandName', required: false, description: 'Filter by brand name' })
  @ApiQuery({ name: 'fuelType', required: false, description: 'Filter by fuel type' })
  @ApiQuery({ name: 'modelYear', required: false, description: 'Filter by model year' })
  @ApiQuery({ name: 'page', required: false, description: 'Pagination - Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit the number of results' })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort by field (e.g., name:asc)' })
  async getAllModels(
    @Query('brandName') brandName?: string,
    @Query('fuelType') fuelType?: string,
    @Query('modelYear') modelYear?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sort') sort?: string
  ): Promise<any> {
    // Convert pagination parameters to numbers
    const pagination = {
      page: parseInt(page.toString(), 10),
      limit: parseInt(limit.toString(), 10),
    };

    // Convert sort parameter into object (e.g., { name: 'asc' })
    const sortOptions = sort
      ? Object.fromEntries(sort.split(',').map((s) => s.split(':')))
      : {};

    return this.modelService.findAll({ brandName, fuelType, modelYear, pagination, sortOptions });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a model by ID' })
  @ApiResponse({ status: 200, description: 'Model fetched successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async getModelById(@Param('id') id: string) {
    return this.modelService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing model by ID' })
  @ApiBody({
    description: 'Update vehicle model details',
    type: UpdateModelDto,
  })
  @ApiResponse({ status: 200, description: 'Model updated successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async updateModel(@Param('id') id: string, @Body() updateModelDto: UpdateModelDto) {
    return this.modelService.update(id, updateModelDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a model by ID' })
  @ApiResponse({ status: 200, description: 'Model deleted successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async deleteModel(@Param('id') id: string) {
    return this.modelService.remove(id);
  }
}
