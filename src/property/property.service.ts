import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PropertyDocument } from './schemas/schema.property'; // Import only PropertyDocument
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel('Property') private readonly propertyModel: Model<PropertyDocument>, // Inject correctly
  ) {}

  async getAllProperties(query: any) {
    const filter = {};

    if (query.title) {
      filter['title'] = { $regex: query.title, $options: 'i' };
    }

    if (query.type) {
      filter['type'] = query.type;
    }

    if (query.category) {
      filter['category'] = query.category;
    }

    if (query.minPrice) {
      filter['price'] = { $gte: query.minPrice };
    }

    if (query.maxPrice) {
      filter['price'] = { $lte: query.maxPrice };
    }

    return await this.propertyModel.find(filter).populate('owner', 'name email');
  }

  async getPropertyById(id: string) {
    return await this.propertyModel.findById(id).populate('owner', 'name email');
  }

  async createProperty(createPropertyDto: CreatePropertyDto) {
    const property = new this.propertyModel(createPropertyDto);
    return await property.save();
  }

  async updateProperty(id: string, updatePropertyDto: UpdatePropertyDto) {
    return await this.propertyModel.findByIdAndUpdate(id, updatePropertyDto, { new: true });
  }

  async deleteProperty(id: string) {
    return await this.propertyModel.findByIdAndDelete(id);
  }
}
