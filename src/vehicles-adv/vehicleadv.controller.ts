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
import { CreateVehicleAdvDto } from './dto/create-vehicle-adv.dto';
import { ApiTags, ApiResponse, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { FindVehicleDto } from './dto/get-vehicle-adv.dto';
import { VehicleAdvService } from './vehicleadv.service';

@ApiTags('Vehicles-Adv')
@Controller('vehiclesadv')
@UseFilters(new HttpExceptionFilter('Vehicles'))
export class VehicleAdvController {
  constructor(private readonly vehicleService: VehicleAdvService) {}

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
  @ApiResponse({ status: 201, description: 'Vehicle created successfully' })
  async createVehicle(@Body() createVehicleDto: CreateVehicleAdvDto) {
    return this.vehicleService.createVehicleAdv(createVehicleDto);
  }

  // @Put(':id')
  // @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  // @ApiResponse({ status: 404, description: 'Vehicle not found' })
  // async updateVehicle(
  //   @Param('id') id: string,
  //   @Body() createVehicleDto: CreateVehicleAdvDto,
  // ) {
  //   return this.vehicleService.updateVehicleAdv(id, createVehicleDto);
  // }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Vehicle deleted successfully' })
  async deleteVehicle(@Param('id') id: string) {
    await this.vehicleService.deleteVehicle(id);
  }
}
