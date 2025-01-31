import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiQuery({ name: 'userId', required: true, type: String })
  async getCartByUserId(@Query('userId') userId: string) {
    return this.cartService.getCartByUserId(userId);
  }

  @Post()
  async addToCart(@Query('userId') userId: string, @Body() createCartDto: CreateCartDto) {
    return this.cartService.addToCart(userId, createCartDto);
  }

  @Put()
  async updateCartItem(@Query('userId') userId: string, @Body() updateCartDto: UpdateCartDto) {
    return this.cartService.updateCartItem(userId, updateCartDto);
  }

  @Delete(':productId')
  async removeFromCart(@Query('userId') userId: string, @Param('productId') productId: string) {
    return this.cartService.removeFromCart(userId, productId);
  }

  @Delete()
  async clearCart(@Query('userId') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
