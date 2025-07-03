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
  UseGuards,
  Request,
} from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import {
  ApiTags,
  ApiResponse,
  ApiQuery,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HttpExceptionFilter } from '../shared/exception-service';
import { FindVehicleDto } from './dto/get-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './schemas/vehicle.schema';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { UserType } from '../users/enums/user.types';

@ApiTags('Vehicles')
@Controller('vehicles')
@UseFilters(new HttpExceptionFilter('Vehicles'))
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN)
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  
  @Get()
  @ApiQuery({
    name: 'modelVehicleName',
    required: false,
    description: 'Name inside vehicleModels',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort format: field:asc|desc',
  })
  async findAll(@Query() query: any) {
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
    @Request() req,
  ): Promise<Vehicle> {
    const { user } = req;
    return this.vehicleService.createVehicle(createVehicleDto, user);
  }

  @Put(':id')
  @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async updateVehicle(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @Request() req,
  ) {
    const { user } = req;
    return this.vehicleService.updateVehicle(id, updateVehicleDto, user);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Vehicle deleted successfully' })
  async deleteVehicle(@Param('id') id: string, @Request() req) {
    const { user } = req;
    await this.vehicleService.softDeleteVehicle(id, user);
  }
}
