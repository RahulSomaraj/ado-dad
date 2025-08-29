import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FindAllCategoriesDto } from './dto/get-category.dto';
import { RedisService } from '../shared/redis.service';
@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    private readonly redisService: RedisService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    user: any,
  ): Promise<Category> {
    const { name, parent } = createCategoryDto;

    // Query for an existing category with the same name and parent (default to null if parent isn't provided)
    const existingCategory = await this.categoryModel.findOne({
      name,
      parent: parent ? parent : null,
    });

    if (existingCategory) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'A category with this name and parent already exists.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // If a parent is provided, verify that the parent category exists.
    if (parent) {
      const parentCategory = await this.categoryModel.findById(parent);
      if (!parentCategory) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'The specified parent category does not exist.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const newCategory = new this.categoryModel(createCategoryDto);
    const saved = await newCategory.save();
    await this.invalidateCategoryCache();
    return saved;
  }

  async findAll(query: FindAllCategoriesDto): Promise<{
    data: Category[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { name, parent, limit = 10, page = 1 } = query;

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
    const cacheKey = `cat:list:${JSON.stringify(normalize(query))}`;
    const cached = await this.redisService.cacheGet<{
      data: Category[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(cacheKey);
    if (cached) return cached;

    // Build filter: only include categories that have not been soft-deleted.
    const filter: any = { deletedAt: null };

    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }

    if (parent) {
      filter.parent = parent;
    }

    // Calculate pagination: number of documents to skip.
    const skip = (page - 1) * limit;

    // Get the total count for pagination.
    const total = await this.categoryModel.countDocuments(filter);

    // Retrieve the categories using the filter, pagination, and skip.
    const categories = await this.categoryModel
      .find(filter)
      .limit(limit)
      .skip(skip)
      .exec();

    if (!categories || categories.length === 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'The specified category does not exist.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const totalPages = Math.ceil(total / limit);

    const response = {
      data: categories,
      total,
      page,
      limit,
      totalPages,
    };
    await this.redisService.cacheSet(cacheKey, response, 600);
    return response;
  }

  async findById(id: string): Promise<Category> {
    const cacheKeyGet = `cat:get:${id}`;
    const cachedGet = await this.redisService.cacheGet<Category>(cacheKeyGet);
    if (cachedGet) return cachedGet;

    const category = await this.categoryModel.findById(id);
    if (!category)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'The specified category does not exist.',
        },
        HttpStatus.BAD_REQUEST,
      );
    await this.redisService.cacheSet(cacheKeyGet, category, 900);
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    user: any,
  ): Promise<Category> {
    // Fetch the current category by id.
    const currentCategory = await this.categoryModel.findById(id);
    if (!currentCategory) {
      throw new NotFoundException('Category not found');
    }

    // If a new parent is provided (and not null), check that it exists.
    if (
      updateCategoryDto.hasOwnProperty('parent') &&
      updateCategoryDto.parent
    ) {
      const parentCategory = await this.categoryModel.findById(
        updateCategoryDto.parent,
      );
      if (!parentCategory) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'The specified parent category does not exist.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Determine the effective values for name and parent after update.
    // If a field isn't provided in the update, use the current value.
    const effectiveName =
      updateCategoryDto.name !== undefined
        ? updateCategoryDto.name
        : currentCategory.name;
    const effectiveParent = updateCategoryDto.hasOwnProperty('parent')
      ? updateCategoryDto.parent
      : currentCategory.parent;

    // Check if another category (with a different id) has the same effective name and parent.
    const duplicateCategory = await this.categoryModel.findOne({
      _id: { $ne: id },
      name: effectiveName,
      parent: effectiveParent ? effectiveParent : null,
    });

    if (duplicateCategory) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'A category with this name and parent already exists.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Proceed to update the category.
    const updatedCategory = await this.categoryModel.findByIdAndUpdate(
      id,
      updateCategoryDto,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedCategory) {
      throw new NotFoundException('Category not found');
    }
    await this.invalidateCategoryCache(id);
    return updatedCategory;
  }

  async delete(id: string, user: any): Promise<void> {
    const updatedCategory = await this.categoryModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true, runValidators: true },
    );
    if (!updatedCategory) {
      throw new NotFoundException('Category not found');
    }
    await this.invalidateCategoryCache(id);
  }

  private async invalidateCategoryCache(id?: string): Promise<void> {
    try {
      const keys = await this.redisService.keys('cat:list:*');
      if (keys?.length) {
        await Promise.all(keys.map((k) => this.redisService.cacheDel(k)));
      }
      if (id) {
        await this.redisService.cacheDel(`cat:get:${id}`);
      }
    } catch {}
  }
}
