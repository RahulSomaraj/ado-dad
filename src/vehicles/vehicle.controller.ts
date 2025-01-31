import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ApiTags, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'make', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiResponse({ status: 200, description: 'List of vehicles' })
  async getAllVehicles(@Query() query): Promise<any> {
    return this.vehicleService.getAllVehicles(query);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Vehicle found' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async getVehicleById(@Param('id') id: string) {
    return this.vehicleService.getVehicleById(id);
  }

  @Post()
  @ApiResponse({ status: 201, description: 'Vehicle created successfully' })
  async createVehicle(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehicleService.createVehicle(createVehicleDto);
  }

  @Put(':id')
  @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async updateVehicle(@Param('id') id: string, @Body() createVehicleDto: CreateVehicleDto) {
    return this.vehicleService.updateVehicle(id, createVehicleDto);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Vehicle deleted successfully' })
  async deleteVehicle(@Param('id') id: string) {
    await this.vehicleService.deleteVehicle(id);
  }
}
