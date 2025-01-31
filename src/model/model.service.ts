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
  async create(createModelDto: CreateModelDto): Promise<VehicleModelDocument> {
    const newModel = new this.modelModel(createModelDto); // Create a new instance
    return newModel.save(); // Save to the database
  }

  // Find all models matching the query
  async findAll(query): Promise<VehicleModelDocument[]> {
    return this.modelModel.find(query).exec(); // Execute the query
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
  async update(id: string, updateModelDto: UpdateModelDto): Promise<VehicleModelDocument> {
    const updatedModel = await this.modelModel.findByIdAndUpdate(id, updateModelDto, { new: true }).exec();
    if (!updatedModel) {
      throw new NotFoundException(`Model with id ${id} not found`); // Handle not found
    }
    return updatedModel; // Return the updated model
  }

  // Remove a model by ID
  async remove(id: string): Promise<void> {
    const result = await this.modelModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Model with id ${id} not found`); // Handle not found
    }
  }
}
