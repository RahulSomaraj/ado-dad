import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle } from './schemas/vehicle.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { Vendor } from './schemas/vendor.schema';

@Injectable()
export class VehicleService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
    @InjectModel(Vendor.name) private vendorModel: Model<Vendor>,
  ) {}

  async getAllVehicles(query): Promise<Vehicle[]> {
    const filter = {};
    if (query.vendorId) filter['additionalInfo.vendor'] = query.vendorId;
    if (query.make) filter['brandName'] = query.make;
    if (query.model) filter['modelName'] = query.model;

    return this.vehicleModel.find(filter).populate('additionalInfo.vendor');
  }

  async getVehicleById(id: string): Promise<Vehicle | null> {
    return this.vehicleModel.findById(id).populate('additionalInfo.vendor');
  }

  async createVehicle(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    if (createVehicleDto.additionalInfo?.vendor) {
      const vendor = await this.vendorModel.findById(createVehicleDto.additionalInfo.vendor);
      if (!vendor) throw new Error('Vendor not found');
    }

    const newVehicle = new this.vehicleModel(createVehicleDto);
    return newVehicle.save();
  }

  async updateVehicle(id: string, createVehicleDto: CreateVehicleDto): Promise<Vehicle | null> {
    if (createVehicleDto.additionalInfo?.vendor) {
      const vendor = await this.vendorModel.findById(createVehicleDto.additionalInfo.vendor);
      if (!vendor) throw new Error('Vendor not found');
    }

    return this.vehicleModel.findByIdAndUpdate(id, createVehicleDto, { new: true }).populate('additionalInfo.vendor');
  }

  async deleteVehicle(id: string): Promise<void> {
    await this.vehicleModel.findByIdAndDelete(id);
  }
}
