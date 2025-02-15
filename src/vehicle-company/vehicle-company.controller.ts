import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { VehicleCompanyService } from './vehicle-company.service';
import { CreateVehicleCompanyDto } from './dto/create-vehicle-company.dto';
import { UpdateVehicleCompanyDto } from './dto/update-vehicle-company.dto';
import { AuthGuard } from 'src/roles/auth.guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { UserRole } from 'src/roles/user-role.enum'; // ✅ Import the UserRole enum
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { FindVehicleCompaniesDto } from './dto/get-vehicle-company.dto';

@ApiTags('Vehicle Companies')
@Controller('vehicle-companies')
@UseFilters(new HttpExceptionFilter('Vehicle-Companies'))
export class VehicleCompanyController {
  constructor(private readonly companyService: VehicleCompanyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vehicle company' })
  async create(@Body() createVCDto: CreateVehicleCompanyDto) {
    return this.companyService.create(createVCDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicle companies' })
  async findAll(@Query() query: FindVehicleCompaniesDto) {
    // Pass the query DTO to the service to filter results accordingly.
    return this.companyService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vehicle company by ID' })
  @ApiParam({ name: 'id', required: true, example: '65a8f60f2a5b5e001e3b5f27' })
  async findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a vehicle company by ID' })
  @ApiParam({ name: 'id', required: true, example: '65a8f60f2a5b5e001e3b5f27' })
  async update(@Param('id') id: string, @Body() dto: UpdateVehicleCompanyDto) {
    return this.companyService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vehicle company by ID' })
  @ApiParam({ name: 'id', required: true, example: '65a8f60f2a5b5e001e3b5f27' })
  async remove(@Param('id') id: string) {
    return this.companyService.remove(id);
  }
}
