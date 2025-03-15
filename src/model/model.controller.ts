import { Controller, Post, Put, Get, Param, Body, Query, Delete, UseFilters } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiQuery } from '@nestjs/swagger';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { ModelService } from './model.service';
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { VehicleModelDocument } from './schemas/schema.model';

@ApiTags('Model')
@Controller('models')
@UseFilters(new HttpExceptionFilter('Models'))
export class ModelController {
  vehicleModelService: any;
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
  @ApiOperation({ summary: 'Get all vehicle models with pagination and sorting' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiQuery({ name: 'sort', required: false, description: 'Sorting field (e.g., name:asc, createdAt:desc)' })
  async findAll(
    @Query() query: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sort') sort?: string
  ): Promise<{ models: VehicleModelDocument[]; totalPages: number; currentPage: number }> {
    
    const pagination = {
      page: parseInt(page.toString(), 10),
      limit: parseInt(limit.toString(), 10),
    };
  
    // Convert sort query from "field:asc,field2:desc" to { field: 1, field2: -1 }
    const sortOptions = sort
      ? Object.fromEntries(sort.split(',').map(s => {
          const [key, value] = s.split(':');
          return [key, value === 'desc' ? -1 : 1];
        }))
      : {};
  
    return this.modelService.findAll(query, pagination.page, pagination.limit, sortOptions);
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
