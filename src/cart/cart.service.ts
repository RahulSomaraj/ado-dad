import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from './schemas/cart.schema';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { Product } from '../product/schemas/product.schema';
import { Types } from 'mongoose';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  // Get cart by user ID
  async getCartByUserId(userId: string): Promise<Cart> {
    const cart = await this.cartModel
      .findOne({ user: userId })
      .populate('items.product'); // Populate product details in items
    if (!cart) throw new NotFoundException('Cart not found');
    return cart;
  }

  // Add items to the cart
  async addToCart(userId: string, createCartDto: CreateCartDto): Promise<Cart> {
    const { items } = createCartDto;

    // Validate if the products exist
    const productIds = items.map((item) => item.product);
    const products = await this.productModel.find({ _id: { $in: productIds } });
    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    let cart = await this.cartModel.findOne({ user: userId });

    if (!cart) {
      // If no cart exists, create a new one
      cart = new this.cartModel({
        user: userId,
        items: items.map((item) => ({
          product: new Types.ObjectId(item.product),
          quantity: item.quantity,
        })),
      });
    } else {
      // If cart exists, merge the items
      items.forEach((newItem) => {
        const existingItem = cart?.items.find(
          (item) =>
            item.product.toString() ===
            new Types.ObjectId(newItem.product).toString(),
        );
        if (existingItem) {
          existingItem.quantity += newItem.quantity; // Update quantity if product already exists
        } else {
          cart?.items.push({
            product: new Types.ObjectId(newItem.product),
            quantity: newItem.quantity,
          });
        }
      });
    }

    await cart.save();
    return cart.populate('items.product'); // Return cart with populated product details
  }

  // Update item quantity in cart
  async updateCartItem(
    userId: string,
    updateCartDto: UpdateCartDto,
  ): Promise<Cart> {
    const { product, quantity } = updateCartDto;

    const cart = await this.cartModel.findOne({ user: userId });
    if (!cart) throw new NotFoundException('Cart not found');

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === product,
    );
    if (itemIndex === -1)
      throw new NotFoundException('Product not found in cart');

    cart.items[itemIndex].quantity = quantity; // Update product quantity
    await cart.save();
    return cart.populate('items.product'); // Return updated cart with populated product details
  }

  // Remove a product from the cart
  async removeFromCart(userId: string, productId: string): Promise<Cart> {
    const cart = await this.cartModel.findOne({ user: userId });
    if (!cart) throw new NotFoundException('Cart not found');

    // Filter out the product to be removed
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId,
    );
    await cart.save();
    return cart.populate('items.product'); // Return updated cart with populated product details
  }

  // Clear all items in the cart
  async clearCart(userId: string): Promise<{ message: string }> {
    const cart = await this.cartModel.findOne({ user: userId });
    if (!cart) throw new NotFoundException('Cart not found');

    cart.items = []; // Clear all items
    await cart.save();
    return { message: 'Cart cleared successfully' };
  }
}
