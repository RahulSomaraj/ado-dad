import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LookupService } from '../services/lookup.service';
import { PropertyType } from '../schemas/property-type.schema';

@ApiTags('Lookup')
@Controller('lookup')
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get('property-types')
  @ApiOperation({ summary: 'Get all property types' })
  @ApiResponse({ status: 200, description: 'List of property types' })
  async getPropertyTypes(): Promise<PropertyType[]> {
    return this.lookupService.getPropertyTypes();
  }

  @Post('property-types')
  @ApiOperation({ summary: 'Create a new property type' })
  @ApiResponse({
    status: 201,
    description: 'Property type created successfully',
  })
  @ApiBody({ type: PropertyType })
  async createPropertyType(@Body() createDto: any): Promise<PropertyType> {
    return this.lookupService.createPropertyType(createDto);
  }

  @Put('property-types/:id')
  @ApiOperation({ summary: 'Update a property type' })
  @ApiResponse({
    status: 200,
    description: 'Property type updated successfully',
  })
  @ApiBody({ type: PropertyType })
  async updatePropertyType(
    @Param('id') id: string,
    @Body() updateDto: any,
  ): Promise<PropertyType> {
    return this.lookupService.updatePropertyType(id, updateDto);
  }

  @Delete('property-types/:id')
  @ApiOperation({ summary: 'Delete a property type' })
  @ApiResponse({
    status: 200,
    description: 'Property type deleted successfully',
  })
  async deletePropertyType(@Param('id') id: string): Promise<void> {
    return this.lookupService.deletePropertyType(id);
  }
}
