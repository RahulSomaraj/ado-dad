import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseFilters } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { VendorService } from './vendor.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { HttpExceptionFilter } from 'src/shared/exception-service';

@ApiTags('Vendors')
@Controller('vendors')
@UseFilters(new HttpExceptionFilter('Vendors'))
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vendor' })
  @ApiResponse({ status: 201, description: 'Vendor created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request (validation errors)' })
  create(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorService.create(createVendorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vendors with optional filters' })
  @ApiResponse({ status: 200, description: 'Vendors fetched successfully' })
  @ApiQuery({ name: 'name', required: false, description: 'Filter by vendor name' })
  @ApiQuery({ name: 'city', required: false, description: 'Filter by vendor city' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit the number of results' })
  @ApiQuery({ name: 'page', required: false, description: 'Pagination - Page number' })
  findAll(
    @Query('name') name?: string,
    @Query('city') city?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number
  ) {
    return this.vendorService.findAll({ name, city, limit, page });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vendor by ID' })
  @ApiResponse({ status: 200, description: 'Vendor fetched successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  findOne(@Param('id') id: string) {
    return this.vendorService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a vendor' })
  @ApiResponse({ status: 200, description: 'Vendor updated successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 400, description: 'Bad request (validation errors)' })
  update(@Param('id') id: string, @Body() updateVendorDto: UpdateVendorDto) {
    return this.vendorService.update(id, updateVendorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vendor' })
  @ApiResponse({ status: 200, description: 'Vendor deleted successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  remove(@Param('id') id: string) {
    return this.vendorService.delete(id);
  }
}
