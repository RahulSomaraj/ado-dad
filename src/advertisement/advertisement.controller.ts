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
  Request,
} from '@nestjs/common';
import { AdvertisementsService } from './advertisement.service';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { FindAdvertisementsDto } from './dto/get-advertisement.dto';
import { Roles } from 'src/roles/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { UserType } from 'src/users/enums/user.types';
import { RolesGuard } from 'src/roles/roles.guard';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { Advertisement } from './schemas/advertisement.schema';

@ApiTags('Advertisements')
@Controller('advertisements')
@UseFilters(new HttpExceptionFilter('Advertisements'))
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN) // Assuming you have a roles mechanism
export class AdvertisementsController {
  constructor(private readonly advertisementService: AdvertisementsService) {}

  // ✅ Create a new advertisement
  @Post()
  @ApiOperation({ summary: 'Create a new advertisement' })
  @ApiResponse({
    status: 201,
    description: 'Advertisement created successfully.',
  })
  async create(
    @Body() createAdvertisementDto: CreateAdvertisementDto,
    @Request() req,
  ) {
    const { user } = req;
    return this.advertisementService.createAdvertisement(
      createAdvertisementDto,
      user,
    );
  }

  // ✅ Get all advertisements with filters & pagination
  @Get()
  @ApiOperation({ summary: 'Retrieve advertisements based on query filters' })
  findAll(@Query() query: FindAdvertisementsDto) {
    return this.advertisementService.findVehicleAdv(query);
  }

  // ✅ Get advertisement by ID
  @Get(':id')
  @ApiOperation({ summary: 'Get advertisement by ID' })
  @ApiResponse({ status: 200, description: 'Advertisement found.' })
  async findOne(@Param('id') id: string) {
    return this.advertisementService.findOne(id);
  }

@Put(':id')
@ApiBearerAuth()
@ApiOperation({ summary: 'Update advertisement (only by owner)' })
@ApiResponse({ status: 200, description: 'Advertisement updated successfully.' })
@ApiResponse({ status: 404, description: 'Not found or unauthorized' })
async update(
  @Param('id') id: string,
  @Body() updateAdvertisementDto: UpdateAdvertisementDto,
  @Request() req,
) {
  const { user } = req;
  return this.advertisementService.update(id, updateAdvertisementDto, user._id);
}

  // ✅ Delete advertisement by ID
  // @Delete(':id')
  // @ApiOperation({ summary: 'Delete advertisement by ID' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Advertisement deleted successfully.',
  // })
  // async remove(@Param('id') id: string, @Query('userId') userId: string) {
  //   return this.advertisementService.remove(id, userId);
  // }

}