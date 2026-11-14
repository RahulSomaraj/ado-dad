import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LookupService } from '../services/lookup.service';
import { PropertyType } from '../schemas/property-type.schema';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth-guard';
import { RolesGuard } from '../../auth/guard/roles.guards';
import { Roles } from '../../auth/guard/roles.decorator';
import { UserType } from '../../users/enums/user.types';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a property type' })
  @ApiResponse({
    status: 200,
    description: 'Property type deleted successfully',
  })
  async deletePropertyType(@Param('id') id: string): Promise<void> {
    return this.lookupService.deletePropertyType(id);
  }
}
