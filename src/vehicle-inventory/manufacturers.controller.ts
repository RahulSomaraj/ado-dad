import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  BadRequestException,
  HttpException,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
   ApiConsumes,
    ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { RolesGuard } from '../auth/guard/roles.guards';
import { Roles } from '../roles/roles.decorator';
import { UserType } from '../users/enums/user.types';
import { ManufacturersService } from './manufacturers.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { UpdateManufacturerDto } from './dto/update-manufacturer.dto';
import { FilterManufacturerDto } from './dto/filter-manufacturer.dto';
import { Manufacturer } from './schemas/manufacturer.schema';
import { PaginatedManufacturerResponseDto } from './dto/manufacturer-response.dto';
import { error } from 'console';
import * as path from 'path';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Vehicle Inventory Manufacturers')
@Controller('vehicle-inventory')
export class ManufacturersController {
  constructor(private readonly manufacturersService: ManufacturersService) {}

  // Manufacturer endpoints - keeping exact same routes as original
  @Post('manufacturers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new manufacturer' })
  @ApiResponse({
    status: 201,
    description: 'Manufacturer created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async createManufacturer(
    @Body() createManufacturerDto: CreateManufacturerDto,
    @Request() req,
  ) {
    const { user } = req;
    return this.manufacturersService.createManufacturer(createManufacturerDto);
  }

  @Get('manufacturers')
  @ApiOperation({
    summary: 'Get all manufacturers with comprehensive filtering',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search manufacturers by name, display name, or description',
    example: 'honda',
  })
  @ApiQuery({
    name: 'originCountry',
    required: false,
    description: 'Filter by origin country',
    example: 'Japan',
  })
  @ApiQuery({
    name: 'minFoundedYear',
    required: false,
    description: 'Filter by minimum founded year',
    example: 1900,
  })
  @ApiQuery({
    name: 'maxFoundedYear',
    required: false,
    description: 'Filter by maximum founded year',
    example: 2000,
  })
  @ApiQuery({
    name: 'headquarters',
    required: false,
    description: 'Filter by headquarters location',
    example: 'Tokyo',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by manufacturer category',
    example: 'passenger_car',
  })
  @ApiQuery({
    name: 'region',
    required: false,
    description: 'Filter by region',
    example: 'Asia',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
    example: true,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort by',
    example: 'name',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (ASC or DESC)',
    example: 'ASC',
  })
  @ApiResponse({
    status: 200,
    description: 'Manufacturers retrieved successfully',
  })
  async findAllManufacturers(
    @Query() filters: FilterManufacturerDto,
  ): Promise<PaginatedManufacturerResponseDto> {
    return this.manufacturersService.findManufacturersWithFilters(filters);
  }

  @Get('manufacturers/:id')
  @ApiOperation({ summary: 'Get a manufacturer by ID' })
  @ApiParam({
    name: 'id',
    description: 'Manufacturer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Manufacturer retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Manufacturer not found' })
  async findManufacturerById(@Param('id') id: string): Promise<Manufacturer> {
    return this.manufacturersService.findManufacturerById(id);
  }

  @Put('manufacturers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a manufacturer' })
  @ApiParam({
    name: 'id',
    description: 'Manufacturer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Manufacturer updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Manufacturer not found' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async updateManufacturer(
    @Param('id') id: string,
    @Body() updateManufacturerDto: UpdateManufacturerDto,
  ): Promise<Manufacturer> {
    return this.manufacturersService.updateManufacturer(
      id,
      updateManufacturerDto,
    );
  }

  @Delete('manufacturers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a manufacturer (soft delete)' })
  @ApiParam({
    name: 'id',
    description: 'Manufacturer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Manufacturer deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Manufacturer not found' })
  async deleteManufacturer(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.manufacturersService.deleteManufacturer(id);
  }


  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Bulk upload manufacturers from CSV file',
    description:
      'Uploads a CSV file to bulk create manufacturer records. Each row should contain at least the `name` field. Duplicate and existing manufacturers will be skipped automatically.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file containing manufacturer data',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Upload a `.csv` file',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Manufacturers uploaded successfully',
    schema: {
      example: {
        totalRows: 10,
        uniqueRows: 8,
        insertedCount: 5,
        skippedCount: 3,
        inserted: [
          { name: 'maruti-suzuki', originCountry: 'India' },
          { name: 'honda', originCountry: 'Japan' },
        ],
        skipped: [
          { row: { name: 'tata' }, reason: 'Already exists in database' },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or missing file',
    schema: {
      example: { statusCode: 400, message: 'Only CSV files are supported' },
    },
  })
  async UploadManufacturerCdb(@UploadedFile() file:Express.Multer.File)
  {
    if(!file)
    {
      throw new HttpException({
        status:HttpStatus.BAD_REQUEST,
        error:"No file uploaded"
      },HttpStatus.BAD_REQUEST);
    }
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (fileExt !== '.csv'){
      throw new BadRequestException('Only CSV files are supported');
    }

    return await this.manufacturersService.createManufacturerFromCsv(file.buffer,'csv');
  }

}
