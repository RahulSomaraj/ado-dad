import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vendor } from './schemas/schema.vendor';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorService {
  constructor(@InjectModel(Vendor.name) private vendorModel: Model<Vendor>) {}

  async create(dto: CreateVendorDto) {
    return this.vendorModel.create(dto);
  }

  async findAll(query: any) {
    return this.vendorModel.find(query);
  }

  async findById(id: string) {
    const vendor = await this.vendorModel.findById(id);
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async update(id: string, dto: UpdateVendorDto) {
    const updatedVendor = await this.vendorModel.findByIdAndUpdate(id, dto, { new: true });
    if (!updatedVendor) throw new NotFoundException('Vendor not found');
    return updatedVendor;
  }

  async delete(id: string) {
    const vendor = await this.vendorModel.findByIdAndDelete(id);
    if (!vendor) throw new NotFoundException('Vendor not found');
    return { message: 'Vendor deleted successfully' };
  }
}