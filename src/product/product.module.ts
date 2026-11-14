import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductSchema } from './schemas/product.schema';
import { RedisModule } from '../shared/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Product', schema: ProductSchema }]), // Register Product model
    RedisModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
