import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductSchema } from './schemas/product.schema';
import { RedisService } from '../shared/redis.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Product', schema: ProductSchema }]), // Register Product model
  ],
  controllers: [ProductController],
  providers: [ProductService, RedisService],
})
export class ProductModule {}
