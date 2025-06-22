import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseFilters,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdvertisementsService } from './advertisement.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { FilterAdvertisementDto } from './dto/filter-advertisement.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { Roles } from 'src/roles/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { UserType } from 'src/users/enums/user.types';
import { RolesGuard } from 'src/roles/roles.guard';
import { Advertisement } from './schemas/advertisement.schema';

@ApiTags('Advertisements')
@Controller('ads')
@UseFilters(new HttpExceptionFilter('Advertisements'))
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN)
export class AdvertisementsController {
  constructor(private readonly advertisementService: AdvertisementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new advertisement' })
  @ApiResponse({
    status: 201,
    description: 'Advertisement created successfully.',
    type: Advertisement,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or category not found.',
  })
  async create(
    @Body() createAdDto: CreateAdvertisementDto,
    @Request() req,
  ): Promise<Advertisement> {
    const { user } = req;
    return this.advertisementService.create(createAdDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all advertisements with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Advertisements retrieved successfully.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Advertisement' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async findAll(@Query() filters: FilterAdvertisementDto) {
    return this.advertisementService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get advertisement by ID' })
  @ApiParam({ name: 'id', description: 'Advertisement ID' })
  @ApiResponse({
    status: 200,
    description: 'Advertisement found successfully.',
    type: Advertisement,
  })
  @ApiResponse({
    status: 404,
    description: 'Advertisement not found.',
  })
  async findOne(@Param('id') id: string): Promise<Advertisement> {
    return this.advertisementService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update advertisement (only by owner)' })
  @ApiParam({ name: 'id', description: 'Advertisement ID' })
  @ApiResponse({
    status: 200,
    description: 'Advertisement updated successfully.',
    type: Advertisement,
  })
  @ApiResponse({
    status: 404,
    description: 'Advertisement not found or unauthorized.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateAdDto: UpdateAdvertisementDto,
    @Request() req,
  ): Promise<Advertisement> {
    const { user } = req;
    return this.advertisementService.update(id, updateAdDto, user._id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete advertisement (only by owner)' })
  @ApiParam({ name: 'id', description: 'Advertisement ID' })
  @ApiResponse({
    status: 200,
    description: 'Advertisement deleted successfully.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Advertisement deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Advertisement not found or unauthorized.',
  })
  async delete(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    const { user } = req;
    return this.advertisementService.delete(id, user._id);
  }
}
