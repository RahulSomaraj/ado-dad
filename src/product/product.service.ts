import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';
import { RedisService } from '../shared/redis.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private readonly redisService: RedisService,
  ) {}

  // Create a new product
  async createProduct(createProductDto: any, user: any): Promise<Product> {
    const createdProduct = new this.productModel(createProductDto);
    const saved = await createdProduct.save();
    await this.invalidateProductCache();
    return saved;
  }

  // Get all products
  // Get all products
  async getAllProducts(p0: {
    category: string | undefined;
    brand: string | undefined;
    minPrice: number | undefined;
    maxPrice: number | undefined;
    pagination: { page: number; limit: number };
    sortOptions: any;
  }): Promise<{
    products: Product[];
    totalPages: number;
    currentPage: number;
  }> {
    const { pagination } = p0;
    const { page, limit } = pagination;

    // Cache key
    const normalize = (obj: any): any => {
      if (obj == null) return obj;
      if (Array.isArray(obj)) return obj.map(normalize);
      if (typeof obj === 'object') {
        const entries = Object.entries(obj)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, v]) => [k, normalize(v)]);
        return Object.fromEntries(entries);
      }
      return obj;
    };
    const cacheKey = `prod:list:${JSON.stringify(normalize(p0))}`;
    const cached = await this.redisService.cacheGet<{
      products: Product[];
      totalPages: number;
      currentPage: number;
    }>(cacheKey);
    if (cached) return cached;

    // Count total matching documents
    const totalProducts = await this.productModel.countDocuments();

    // Fetch products with pagination
    const products = await this.productModel
      .find()
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    const resp = {
      products,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
    };
    await this.redisService.cacheSet(cacheKey, resp, 180);
    return resp;
  }

  // Get a product by ID
  async getProductById(productId: string): Promise<Product> {
    const cacheKey = `prod:get:${productId}`;
    const cached = await this.redisService.cacheGet<Product>(cacheKey);
    if (cached) return cached;

    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    await this.redisService.cacheSet(cacheKey, product, 900);
    return product;
  }

  // Update a product by ID
  async updateProduct(
    productId: string,
    updateProductDto: any,
    user: any,
  ): Promise<Product> {
    const existingProduct = await this.productModel.findById(productId).exec();
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Update the product fields
    Object.assign(existingProduct, updateProductDto);
    const saved = await existingProduct.save();
    await this.invalidateProductCache(productId);
    return saved;
  }

  // Delete a product by ID
  async deleteProduct(productId: string, user: any): Promise<void> {
    const result = await this.productModel.deleteOne({ _id: productId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    await this.invalidateProductCache(productId);
  }

  private async invalidateProductCache(productId?: string): Promise<void> {
    try {
      const keys = await this.redisService.keys('prod:list:*');
      if (keys?.length) {
        await Promise.all(keys.map((k) => this.redisService.cacheDel(k)));
      }
      if (productId) {
        await this.redisService.cacheDel(`prod:get:${productId}`);
      }
    } catch {}
  }
}
