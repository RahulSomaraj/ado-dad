import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AdvertisementsService } from './advertisement.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { FindAdvertisementsDto } from './dto/get-advertisement.dto';
import { Roles } from 'src/roles/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { UserType } from 'src/users/enums/user.types';

@ApiTags('Advertisements')
@Controller('advertisements')
@UseFilters(new HttpExceptionFilter('Advertisements'))
@UseGuards(JwtAuthGuard)
@Roles(UserType.SHOWROOM, UserType.USER, UserType.SHOWROOM) // Assuming you have a roles mechanism
export class AdvertisementsController {
  constructor(private readonly advertisementService: AdvertisementsService) {}

  // ✅ Create a new advertisement
  @Post()
  @ApiOperation({ summary: 'Create a new advertisement' })
  @ApiResponse({
    status: 201,
    description: 'Advertisement created successfully.',
  })
  async create(@Body() createAdvertisementDto: CreateAdvertisementDto) {
    return this.advertisementService.create(createAdvertisementDto);
  }

  // ✅ Get all advertisements with filters & pagination
  @Get()
  @ApiOperation({ summary: 'Retrieve advertisements based on query filters' })
  findAll(@Query() query: FindAdvertisementsDto) {
    return this.advertisementService.findAdvertisements(query);
  }

  // ✅ Get advertisement by ID
  @Get(':id')
  @ApiOperation({ summary: 'Get advertisement by ID' })
  @ApiResponse({ status: 200, description: 'Advertisement found.' })
  async findOne(@Param('id') id: string) {
    return this.advertisementService.findOne(id);
  }

  // ✅ Update advertisement by ID
  @Put(':id')
  @ApiOperation({ summary: 'Update advertisement by ID' })
  @ApiResponse({
    status: 200,
    description: 'Advertisement updated successfully.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateAdvertisementDto: UpdateAdvertisementDto,
    @Query('userId') userId: string,
  ) {
    return this.advertisementService.update(id, updateAdvertisementDto, userId);
  }

  // ✅ Delete advertisement by ID
  @Delete(':id')
  @ApiOperation({ summary: 'Delete advertisement by ID' })
  @ApiResponse({
    status: 200,
    description: 'Advertisement deleted successfully.',
  })
  async remove(@Param('id') id: string, @Query('userId') userId: string) {
    return this.advertisementService.remove(id, userId);
  }
}
