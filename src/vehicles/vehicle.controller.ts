import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseFilters,
} from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ApiTags, ApiResponse, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { FindVehicleDto } from './dto/get-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './schemas/vehicle.schema';

@ApiTags('Vehicles')
@Controller('vehicles')
@UseFilters(new HttpExceptionFilter('Vehicles'))
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiOperation({ summary: 'Search vehicles with filters and pagination' })
  async findVehicles(@Query() query: FindVehicleDto) {
    return this.vehicleService.findVehicles(query);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Vehicle found' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async getVehicleById(@Param('id') id: string) {
    return this.vehicleService.getVehicleById(id);
  }
  @Post()
  @ApiOperation({ summary: 'Create a vehicle' })
  @ApiResponse({ status: 201, description: 'Vehicle created', type: Vehicle })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createVehicle(
    @Body() createVehicleDto: CreateVehicleDto,
  ): Promise<Vehicle> {
    return this.vehicleService.createVehicle(createVehicleDto);
  }

  @Put(':id')
  @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async updateVehicle(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return this.vehicleService.updateVehicle(id, updateVehicleDto);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Vehicle deleted successfully' })
  async deleteVehicle(@Param('id') id: string) {
    await this.vehicleService.softDeleteVehicle(id);
  }
}
