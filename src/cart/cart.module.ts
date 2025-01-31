import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartSchema } from './schemas/cart.schema';
import { ProductModule } from '../product/product.module'; // Import ProductModule
import { ProductSchema } from '../product/schemas/product.schema'; // Make sure Product schema is available

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Cart', schema: CartSchema }]),  // Register Cart model
    MongooseModule.forFeature([{ name: 'Product', schema: ProductSchema }]),  // Register Product model
    ProductModule,  // Ensure ProductModule is imported for dependency injection
  ],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
