import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VehicleCompany } from './schemas/schema.vehicle-company';
import { CreateVehicleCompanyDto } from './dto/create-vehicle-company.dto';
import { UpdateVehicleCompanyDto } from './dto/update-vehicle-company.dto';
import { DuplicateEntityException } from '../common/exceptions/business.exceptions';

@Injectable()
export class VehicleCompanyService {
  constructor(
    @InjectModel(VehicleCompany.name) private readonly vehicleCompanyModel: Model<VehicleCompany>,
  ) {}

  async create(data: CreateVehicleCompanyDto): Promise<VehicleCompany> {
    const existingCompany = await this.findByName(data.name);
    if (existingCompany) {
      throw new DuplicateEntityException('Vehicle Company', `name "${data.name}"`);
    }
    
    const newCompany = new this.vehicleCompanyModel(data);
    return newCompany.save();
  }

  async createOrSkip(data: CreateVehicleCompanyDto): Promise<VehicleCompany | null> {
    const existingCompany = await this.findByName(data.name);
    if (existingCompany) {
      return null; // Skip if exists
    }
    
    const newCompany = new this.vehicleCompanyModel(data);
    return newCompany.save();
  }

  async findByName(name: string): Promise<VehicleCompany | null> {
    return this.vehicleCompanyModel.findOne({ name }).exec();
  }

  async findAll(): Promise<VehicleCompany[]> {
    return this.vehicleCompanyModel.find().exec();
  }

  async findOne(id: string): Promise<VehicleCompany> {
    const company = await this.vehicleCompanyModel.findById(id).exec();
    if (!company) {
      throw new NotFoundException(`Vehicle Company with id ${id} not found`);
    }
    return company;
  }

  async update(id: string, data: UpdateVehicleCompanyDto): Promise<VehicleCompany> {
    const updatedCompany = await this.vehicleCompanyModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!updatedCompany) {
      throw new NotFoundException(`Vehicle Company with id ${id} not found`);
    }
    return updatedCompany;
  }

  async remove(id: string): Promise<void> {
    const result = await this.vehicleCompanyModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Vehicle Company with id ${id} not found`);
    }
  }
}
