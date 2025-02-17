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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './schemas/category.schema';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { RolesGuard } from '../auth/guard/roles.guards';
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { FindAllCategoriesDto } from './dto/get-category.dto';

@ApiTags('Categories')
@Controller('categories')
@UseFilters(new HttpExceptionFilter('Categories'))
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  // @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all categories with optional filters' })
  @ApiResponse({ status: 200, description: 'Categories fetched successfully' })
  async findAll(@Query() query: FindAllCategoriesDto): Promise<{
    data: Category[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.categoryService.findAll(query);
  }

  @Get(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiResponse({ status: 200, description: 'Category fetched successfully' })
  async findById(@Param('id') id: string): Promise<Category> {
    return this.categoryService.findById(id);
  }

  @Put(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  //@Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  //@Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.categoryService.delete(id);
  }
}
