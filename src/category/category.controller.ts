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
} from '@nestjs/common';
import { UserRole } from 'src/roles/user-role.enum'; // ✅ Corrected path
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './schemas/category.schema';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/roles/roles.decorator'; // ✅ Corrected path

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  //@UseGuards(AuthGuard('jwt'), RbacGuard)
  //@Roles(UserRole.Admin)
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
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filter by category name',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit the number of results',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Pagination - Page number',
  })
  async findAll(
    @Query('name') name?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ): Promise<Category[]> {
    return this.categoryService.findAll({ name, limit, page });
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiResponse({ status: 200, description: 'Category fetched successfully' })
  async findById(@Param('id') id: string): Promise<Category> {
    return this.categoryService.findById(id);
  }

  @Put(':id')
  //@UseGuards(AuthGuard('jwt'), RbacGuard)
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
  //@UseGuards(AuthGuard('jwt'), RbacGuard)
  //@Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.categoryService.delete(id);
  }
}
