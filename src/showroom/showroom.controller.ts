import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseFilters,
  Request,
} from '@nestjs/common';
import { ShowroomService } from './showroom.service';
import { Showroom } from './schemas/showroom.schema';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateShowroomDto } from './dto/create-showroom.dto';
import { UpdateShowroomDto } from './dto/update-showroom.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { UserType } from 'src/users/enums/user.types';
import { HttpExceptionFilter } from 'src/shared/exception-service';

@ApiTags('Showrooms')
@Controller('showrooms')
@UseFilters(new HttpExceptionFilter('Showrooms'))
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN)
export class ShowroomController {
  constructor(private readonly showroomService: ShowroomService) {}

  @Get()
  @ApiOperation({ summary: 'Get all showrooms with optional query filters' })
  @ApiResponse({ status: 200, description: 'List of all showrooms' })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by location',
  })
  @ApiQuery({ name: 'brand', required: false, description: 'Filter by brand' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort by field (e.g., name:asc, location:desc)',
  })
  async getShowrooms(
    @Query('location') location?: string,
    @Query('brand') brand?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sort') sort?: string,
  ): Promise<Showroom[]> {
    const pagination = {
      page: parseInt(page.toString(), 10),
      limit: parseInt(limit.toString(), 10),
    };

    const sortOptions = sort
      ? Object.fromEntries(sort.split(',').map((s) => s.split(':')))
      : {};

    return this.showroomService.getShowrooms({
      location,
      brand,
      pagination,
      sortOptions,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a showroom by ID' })
  @ApiResponse({ status: 200, description: 'Showroom details' })
  async getShowroomById(@Param('id') id: string): Promise<Showroom> {
    return this.showroomService.getShowroomById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new showroom' })
  @ApiResponse({
    status: 201,
    description: 'Showroom added successfully',
    type: Showroom,
  })
  async addShowroom(
    @Body() createShowroomDto: CreateShowroomDto,
    @Request() req,
  ): Promise<Showroom> {
    const { user } = req;
    return this.showroomService.addShowroom(createShowroomDto, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a showroom' })
  @ApiResponse({
    status: 200,
    description: 'Showroom updated successfully',
    type: Showroom,
  })
  async updateShowroom(
    @Param('id') id: string,
    @Body() updateShowroomDto: UpdateShowroomDto,
    @Request() req,
  ): Promise<Showroom> {
    const { user } = req;
    return this.showroomService.updateShowroom(id, updateShowroomDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a showroom' })
  @ApiResponse({ status: 200, description: 'Showroom deleted successfully' })
  async deleteShowroom(@Param('id') id: string, @Request() req): Promise<void> {
    const { user } = req;
    return this.showroomService.deleteShowroom(id, user);
  }
}
