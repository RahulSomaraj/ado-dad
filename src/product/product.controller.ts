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
import { ProductService } from './product.service';
import { Product } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { UserType } from 'src/users/enums/user.types';

@ApiTags('Products')
@Controller('products')
@UseFilters(new HttpExceptionFilter('Products'))
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiBody({
    type: CreateProductDto,
    examples: {
      example1: {
        summary: 'Example Product',
        value: {
          name: 'iPhone 15',
          brand: 'Apple',
          category: 'Electronics',
          price: 999,
          stock: 10,
          images: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg',
          ],
          description: 'Latest Apple smartphone with A17 chip',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async create(
    @Body() createProductDto: CreateProductDto,
    @Request() req,
  ): Promise<Product> {
    const { user } = req;
    return this.productService.createProduct(createProductDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with optional filters' })
  @ApiResponse({ status: 200, description: 'List of products' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
  })
  @ApiQuery({ name: 'brand', required: false, description: 'Filter by brand' })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    description: 'Filter by minimum price',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    description: 'Filter by maximum price',
  })
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
    description: 'Sort by field (e.g., price:asc, name:desc)',
  })
  async getAll(
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('sort') sort?: string,
  ): Promise<{ products: Product[]; totalPages: number; currentPage: number }> {
    const pagination = {
      page: parseInt(page.toString(), 10),
      limit: parseInt(limit.toString(), 10),
    };

    const sortOptions = sort
      ? Object.fromEntries(
          sort.split(',').map((s) => {
            const [key, value] = s.split(':');
            return [key, value === 'desc' ? -1 : 1];
          }),
        )
      : {};

    return this.productService.getAllProducts({
      category,
      brand,
      minPrice,
      maxPrice,
      pagination,
      sortOptions,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  async getById(@Param('id') id: string): Promise<Product> {
    return this.productService.getProductById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product by ID' })
  @ApiBody({
    type: UpdateProductDto,
    examples: {
      example1: {
        summary: 'Update Product Example',
        value: {
          price: 899,
          stock: 5,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ): Promise<Product> {
    const { user } = req;
    return this.productService.updateProduct(id, updateProductDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product by ID' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    const { user } = req;
    return this.productService.deleteProduct(id, user);
  }
  
}
