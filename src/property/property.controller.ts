import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { UserRole } from 'src/roles/user-role.enum'; // Import UserRole enum

@ApiTags('Properties')
@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all properties with optional query filters' })
  @ApiResponse({ status: 200, description: 'Properties fetched successfully' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  @ApiQuery({ name: 'priceMin', required: false, description: 'Minimum price filter' })
  @ApiQuery({ name: 'priceMax', required: false, description: 'Maximum price filter' })
  @ApiQuery({ name: 'propertyType', required: false, description: 'Filter by property type' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort by field (e.g., price:asc, date:desc)' })
  async getAllProperties(
    @Query('location') location?: string,
    @Query('priceMin') priceMin?: string,
    @Query('priceMax') priceMax?: string,
    @Query('propertyType') propertyType?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sort') sort?: string
  ) {
    const pagination = {
      page: parseInt(page.toString(), 10),
      limit: parseInt(limit.toString(), 10),
    };

    const sortOptions = sort
      ? Object.fromEntries(sort.split(',').map((s) => s.split(':')))
      : {};

    return await this.propertyService.getAllProperties({
      location,
      priceMin,
      priceMax,
      propertyType,
      pagination,
      sortOptions,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a property by ID' })
  @ApiResponse({ status: 200, description: 'Property fetched successfully' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getPropertyById(@Param('id') id: string) {
    return await this.propertyService.getPropertyById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Seller)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new property' })
  @ApiResponse({ status: 201, description: 'Property created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Only sellers can create properties' })
  async createProperty(@Body() createPropertyDto: CreatePropertyDto) {
    return await this.propertyService.createProperty(createPropertyDto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin, UserRole.Seller)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing property' })
  @ApiResponse({ status: 200, description: 'Property updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Only admins or sellers can update properties' })
  async updateProperty(@Param('id') id: string, @Body() updatePropertyDto: UpdatePropertyDto) {
    return await this.propertyService.updateProperty(id, updatePropertyDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin, UserRole.Seller)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a property' })
  @ApiResponse({ status: 200, description: 'Property deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Only admins or sellers can delete properties' })
  async deleteProperty(@Param('id') id: string) {
    return await this.propertyService.deleteProperty(id);
  }
}
