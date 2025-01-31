import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
  ) {}

  // Create a new product
  async createProduct(createProductDto: any): Promise<Product> {
    const createdProduct = new this.productModel(createProductDto);
    return createdProduct.save();
  }

  // Get all products
  async getAllProducts(p0: { category: string | undefined; brand: string | undefined; minPrice: number | undefined; maxPrice: number | undefined; pagination: { page: number; limit: number; }; sortOptions: any; }): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  // Get a product by ID
  async getProductById(productId: string): Promise<Product> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    return product;
  }

  // Update a product by ID
  async updateProduct(productId: string, updateProductDto: any): Promise<Product> {
    const existingProduct = await this.productModel.findById(productId).exec();
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Update the product fields
    Object.assign(existingProduct, updateProductDto);
    return existingProduct.save();
  }

  // Delete a product by ID
  async deleteProduct(productId: string): Promise<void> {
    const result = await this.productModel.deleteOne({ _id: productId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
  }
}
