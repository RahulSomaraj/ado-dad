import { Injectable, NotFoundException } from '@nestjs/common'; // Import NotFoundException
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { VehicleModelDocument } from './schemas/schema.model'; // Import the Document type

@Injectable()
export class ModelService {
  constructor(
    @InjectModel('Model') private modelModel: Model<VehicleModelDocument>, // Use 'Model' as the model name
  ) {}

  // Create a new model entry
  async create(
    createModelDto: CreateModelDto,
    user: any,
  ): Promise<VehicleModelDocument> {
    const newModel = new this.modelModel(createModelDto); // Create a new instance
    return newModel.save(); // Save to the database
  }

  async findAll(
    query: any,
    page: number,
    limit: number,
    sortOptions: Record<string, any>,
  ): Promise<{
    models: VehicleModelDocument[];
    totalPages: number;
    currentPage: number;
  }> {
    // Convert page and limit values
    const skip = (page - 1) * limit;

    // Count total documents for pagination
    const totalDocuments = await this.modelModel.countDocuments(query);

    // Fetch paginated and sorted data
    const models = await this.modelModel
      .find(query)
      .sort(sortOptions) // Apply sorting
      .skip(skip) // Apply pagination
      .limit(limit) // Limit results
      .exec();

    return {
      models,
      totalPages: Math.ceil(totalDocuments / limit),
      currentPage: page,
    };
  }

  // Find a single model by its ID
  async findOne(id: string): Promise<VehicleModelDocument> {
    const model = await this.modelModel.findById(id).exec(); // Find model by ID
    if (!model) {
      throw new NotFoundException(`Model with id ${id} not found`); // Handle not found
    }
    return model; // Return the model if found
  }

  // Update an existing model by ID
  async update(
    id: string,
    updateModelDto: UpdateModelDto,
    user: any,
  ): Promise<VehicleModelDocument> {
    const updatedModel = await this.modelModel
      .findByIdAndUpdate(id, updateModelDto, { new: true })
      .exec();
    if (!updatedModel) {
      throw new NotFoundException(`Model with id ${id} not found`); // Handle not found
    }
    return updatedModel; // Return the updated model
  }

  // Remove a model by ID
  async remove(id: string, user: any): Promise<void> {
    const result = await this.modelModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Model with id ${id} not found`); // Handle not found
    }
  }
}
