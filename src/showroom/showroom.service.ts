import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Showroom, ShowroomDocument } from './schemas/showroom.schema';
import { CreateShowroomDto } from './dto/create-showroom.dto';
import { UpdateShowroomDto } from './dto/update-showroom.dto';

@Injectable()
export class ShowroomService {
  constructor(
    @InjectModel(Showroom.name) private readonly showroomModel: Model<ShowroomDocument>,
  ) {}

  // Get all showrooms
  async getShowrooms(p0: { location: string | undefined; brand: string | undefined; pagination: { page: number; limit: number; }; sortOptions: any; }): Promise<ShowroomDocument[]> {
    return this.showroomModel.find().exec();
  }

  // Get showroom by ID
  async getShowroomById(id: string): Promise<ShowroomDocument> {
    const showroom = await this.showroomModel.findById(id).exec();
    if (!showroom) {
      throw new NotFoundException(`Showroom with ID "${id}" not found.`);
    }
    return showroom;
  }

  // Add a new showroom
  async addShowroom(createShowroomDto: CreateShowroomDto): Promise<ShowroomDocument> {
    const newShowroom = new this.showroomModel(createShowroomDto);
    return newShowroom.save();
  }

  // Update a showroom
  async updateShowroom(id: string, updateShowroomDto: UpdateShowroomDto): Promise<ShowroomDocument> {
    const updatedShowroom = await this.showroomModel
      .findByIdAndUpdate(id, updateShowroomDto, { new: true, runValidators: true })
      .exec();
    if (!updatedShowroom) {
      throw new NotFoundException(`Showroom with ID "${id}" not found.`);
    }
    return updatedShowroom;
  }

  // Delete a showroom
  async deleteShowroom(id: string): Promise<void> {
    const result = await this.showroomModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Showroom with ID "${id}" not found.`);
    }
  }
}
