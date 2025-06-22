import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseFilters,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
  ApiOperation,
} from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { UserType } from 'src/users/enums/user.types';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
@UseFilters(new HttpExceptionFilter('Cart'))
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.USER, UserType.SHOWROOM)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  @ApiQuery({ name: 'userId', required: true, type: String })
  async getCartByUserId(@Request() req) {
    const { user } = req;
    return this.cartService.getCartByUserId(user._id);
  }

  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  async addToCart(@Body() createCartDto: CreateCartDto, @Request() req) {
    const { user } = req;
    return this.cartService.addToCart(user._id, createCartDto);
  }

  @Put()
  @ApiOperation({ summary: 'Update cart item' })
  async updateCartItem(@Body() updateCartDto: UpdateCartDto, @Request() req) {
    const { user } = req;
    return this.cartService.updateCartItem(user._id, updateCartDto);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeFromCart(@Param('productId') productId: string, @Request() req) {
    const { user } = req;
    return this.cartService.removeFromCart(user._id, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear user cart' })
  async clearCart(@Request() req) {
    const { user } = req;
    return this.cartService.clearCart(user._id);
  }
}
