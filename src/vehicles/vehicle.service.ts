import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle } from './schemas/vehicle.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { VehicleCompany } from 'src/vehicle-company/schemas/schema.vehicle-company';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { FindVehicleDto } from './dto/get-vehicle.dto';
import { VehicleTypes } from './enum/vehicle.type';

@Injectable()
export class VehicleService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
    @InjectModel(VehicleCompany.name)
    private vehicleCompanyModel: Model<VehicleCompany>,
  ) {}

  async findVehicles(findDto: FindVehicleDto): Promise<Vehicle[]> {
    const filter: any = {
      isDeleted: false, // Exclude soft-deleted vehicles.
    };

    // Top-level filters
    if (findDto.name) {
      filter.name = { $regex: findDto.name, $options: 'i' };
    }
    if (findDto.modelName) {
      filter.modelName = { $regex: findDto.modelName, $options: 'i' };
    }
    if (findDto.modelYear) {
      filter['details.modelYear'] = findDto.modelYear;
    }
    if (findDto.month) {
      filter['details.month'] = { $regex: findDto.month, $options: 'i' };
    }

    // Vendor filter
    if (findDto.vendor) {
      filter.vendor = findDto.vendor;
    }

    // Nested filter for vehicleModels using $elemMatch if provided
    if (findDto.vehicleModel) {
      const vmQuery: any = {};
      if (findDto.vehicleModel.name) {
        vmQuery.name = { $regex: findDto.vehicleModel.name, $options: 'i' };
      }
      if (findDto.vehicleModel.modelName) {
        vmQuery.modelName = {
          $regex: findDto.vehicleModel.modelName,
          $options: 'i',
        };
      }
      if (findDto.vehicleModel.fuelType) {
        vmQuery.fuelType = findDto.vehicleModel.fuelType;
      }
      if (findDto.vehicleModel.transmissionType) {
        vmQuery.transmissionType = findDto.vehicleModel.transmissionType;
      }
      if (findDto.vehicleModel.mileage) {
        vmQuery.mileage = {
          $regex: findDto.vehicleModel.mileage,
          $options: 'i',
        };
      }
      // Additional nested filter for additionalInfo
      if (findDto.vehicleModel.additionalInfo) {
        const additionalInfoQuery: any = {};
        if (findDto.vehicleModel.additionalInfo.abs !== undefined) {
          additionalInfoQuery.abs = findDto.vehicleModel.additionalInfo.abs;
        }
        // Add additional additionalInfo filters as needed.
        if (Object.keys(additionalInfoQuery).length > 0) {
          vmQuery.additionalInfo = additionalInfoQuery;
        }
      }
      filter.vehicleModels = { $elemMatch: vmQuery };
    }

    // Pagination
    const page = findDto.page || 1;
    const limit = findDto.limit || 10;
    const skip = (page - 1) * limit;

    return this.vehicleModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .populate('vendor')
      .exec();
  }

  async getVehicleById(id: string): Promise<Vehicle | null> {
    return this.vehicleModel
      .findById(id)
      .populate('vendor') // populate the top-level vendor (VehicleCompany)
      .populate({
        path: 'vehicleModels.additionalInfo.vendor', // populate the nested vendor field
        model: 'VehicleCompany', // adjust this if the nested vendor references a different model
      })
      .exec();
  }

  async createVehicle(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    // Check if the provided vendor (VehicleCompany) exists.
    const vehicleCompany = await this.vehicleCompanyModel.findById(
      createVehicleDto.vendor,
    );
    if (!vehicleCompany) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Vehicle company (vendor) not found.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Ensure at least one vehicle model is provided.
    if (
      !createVehicleDto.vehicleModels ||
      createVehicleDto.vehicleModels.length === 0
    ) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'At least one vehicle model is required.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Build the vehicle object manually using the DTO data.
    const vehicleData = {
      name: createVehicleDto.name,
      modelName: createVehicleDto.modelName,
      modelType: createVehicleDto.modelType || VehicleTypes.SEDAN,
      details: createVehicleDto.details,
      createdBy: createVehicleDto.createdBy,
      vendor: createVehicleDto.vendor,
      vehicleModels: createVehicleDto.vehicleModels,
      color: createVehicleDto.color,
    };

    const newVehicle = new this.vehicleModel(vehicleData);
    return newVehicle.save();
  }

  async updateVehicle(
    vehicleId: string,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    // Check if the provided vendor (VehicleCompany) exists if vendor is provided.
    if (updateVehicleDto.vendor) {
      const vehicleCompany = await this.vehicleCompanyModel.findById(
        updateVehicleDto.vendor,
      );
      if (!vehicleCompany) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Vehicle company (vendor) not found.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Find the existing vehicle document.
    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new HttpException(
        { status: HttpStatus.NOT_FOUND, error: 'Vehicle not found.' },
        HttpStatus.NOT_FOUND,
      );
    }

    // If new vehicle models are provided, map them to plain objects and append.
    if (
      updateVehicleDto.vehicleModels &&
      updateVehicleDto.vehicleModels.length > 0
    ) {
      // Map DTO models to plain objects; this conversion ensures type compatibility.
      const newModels = updateVehicleDto.vehicleModels.map((modelDto) => ({
        ...modelDto,
        // Explicitly ensure fuelType and transmissionType are strings.
        fuelType: String(modelDto.fuelType),
        transmissionType: String(modelDto.transmissionType),
      }));

      // Append new models to the existing array.
      vehicle.vehicleModels = (vehicle.vehicleModels || []).concat(newModels);

      // Remove vehicleModels from update DTO so it does not overwrite the array.
      delete updateVehicleDto.vehicleModels;
    }

    // Merge other updated fields into the existing document.
    Object.assign(vehicle, updateVehicleDto);
    return vehicle.save();
  }

  async deleteVehicle(id: string): Promise<void> {
    await this.vehicleModel.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    );
  }
}
