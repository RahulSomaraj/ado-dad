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
@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
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
    return newCategory.save();
  }

  async findAll(query: FindAllCategoriesDto): Promise<Category[]> {
    const { name, parent, limit = 10, page = 1 } = query;

    // Build filter: only include categories that have not been soft-deleted.
    const filter: any = { deletedAt: null };

    if (name) {
      // Use a case-insensitive regex search for name
      filter.name = { $regex: name, $options: 'i' };
    }

    if (parent) {
      // Filter by parent category ID if provided
      filter.parent = parent;
    }

    // Calculate pagination: number of documents to skip
    const skip = (page - 1) * limit;
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

    return categories;
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryModel.findById(id);
    if (!category)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'The specified category does not exist.',
        },
        HttpStatus.BAD_REQUEST,
      );
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
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
    return updatedCategory;
  }

  async delete(id: string): Promise<void> {
    const updatedCategory = await this.categoryModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true, runValidators: true },
    );
    if (!updatedCategory) {
      throw new NotFoundException('Category not found');
    }
  }
}
