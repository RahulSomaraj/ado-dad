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
import { CreateVehicleAdvDto } from './dto/create-vehicle-adv.dto';
import {
  ApiTags,
  ApiResponse,
  ApiQuery,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { FindVehicleAdvDto } from './dto/get-vehicle-adv.dto';
import { VehicleAdvService } from './vehicleadv.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { UserType } from 'src/users/enums/user.types';

@ApiTags('Vehicles-Adv')
@Controller('vehiclesadv')
@UseFilters(new HttpExceptionFilter('Vehicles'))
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN)
export class VehicleAdvController {
  constructor(private readonly vehicleService: VehicleAdvService) {}

  @Get()
  @ApiOperation({ summary: 'Search vehicles with filters and pagination' })
  async findVehicles(@Query() query: FindVehicleAdvDto) {
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
  async createVehicle(
    @Body() createVehicleDto: CreateVehicleAdvDto,
    @Request() req,
  ) {
    const { user } = req;
    return this.vehicleService.createVehicleAdv(createVehicleDto, user);
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
  async deleteVehicle(@Param('id') id: string, @Request() req) {
    const { user } = req;
    await this.vehicleService.deleteVehicle(id, user._id);
  }
}
