import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, VehicleDocument } from './schemas/vehicle.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { FindVehicleDto } from './dto/get-vehicle.dto';
import { VehicleTypes, WheelerType } from './enum/vehicle.type';

@Injectable()
export class VehicleService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
  ) {}

  async findVehicles(query: any): Promise<{ vehicles: any[] }> {
    const filter: any = { deletedAt: null };

    const isFiltered = !!query.modelVehicleName?.trim();

    if (isFiltered) {
      filter.vehicleModels = {
        $elemMatch: {
          name: {
            $regex: escapeRegex(query.modelVehicleName.trim()),
            $options: 'i',
          },
        },
      };
    }

    const page = query.page && query.page > 0 ? +query.page : 1;
    const limit = query.limit && query.limit > 0 ? +query.limit : 10;
    const skip = (page - 1) * limit;

    const sortObj: any = {};
    if (query.sort) {
      const [field, order] = query.sort.split(':');
      sortObj[field] = order === 'desc' ? -1 : 1;
    }

    const vehicles = await this.vehicleModel
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      vehicles,
    };
  }

  async getVehicleById(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleModel.findById(id).exec();

    if (!vehicle) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Vehicle not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return vehicle;
  }

  async createVehicle(
    createVehicleDto: CreateVehicleDto,
    user: any,
  ): Promise<Vehicle> {
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

    // Check if a vehicle with the same combination of name, modelName, and modelType already exists.
    const duplicateVehicle = await this.vehicleModel.findOne({
      name: createVehicleDto.name,
      modelName: createVehicleDto.modelName,
      modelType: createVehicleDto.modelType || VehicleTypes.SEDAN,
    });

    if (duplicateVehicle) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error:
            'A vehicle with the same name, model name, and model type already exists.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check for duplicate vehicle models in the provided array.
    const modelKeys = new Set<string>();
    for (const model of createVehicleDto.vehicleModels) {
      const key = `${model.name}-${model.modelName}-${model.transmissionType}-${model.fuelType}`;
      if (modelKeys.has(key)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error:
              'Duplicate vehicle model found with the same combination of name, model name, transmission type and fuel type.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      modelKeys.add(key);
    }

    // Build the vehicle object using the DTO data.
    const vehicleData = {
      name: createVehicleDto.name,
      modelName: createVehicleDto.modelName,
      modelType: createVehicleDto.modelType || VehicleTypes.SEDAN,
      wheelerType: createVehicleDto.wheelerType || WheelerType.FOUR_WHEELER,
      details: createVehicleDto.details,
      vehicleModels: createVehicleDto.vehicleModels,
      color: createVehicleDto.color,
    };

    const newVehicle = new this.vehicleModel(vehicleData);
    return newVehicle.save();
  }

  async updateVehicle(
    id: string,
    updateVehicleDto: UpdateVehicleDto,
    user: any,
  ): Promise<Vehicle> {
    const vehicle = await this.vehicleModel.findById(id);

    if (!vehicle) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Vehicle not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Validate vendor if provided: ensure the referenced VehicleCompany exists.
    if (updateVehicleDto.vendor) {
      // Since we removed VehicleCompany, we'll skip this validation
      // or you can implement a different validation logic here
    }

    // Update the vehicle with the provided data
    const updatedVehicle = await this.vehicleModel
      .findByIdAndUpdate(id, updateVehicleDto, { new: true })
      .exec();

    if (!updatedVehicle) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Vehicle not found after update.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return updatedVehicle;
  }

  async softDeleteVehicle(id: string, user: any): Promise<Vehicle> {
    const vehicle = await this.vehicleModel.findById(id);

    if (!vehicle) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Vehicle not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    vehicle.deletedAt = new Date();
    return vehicle.save();
  }
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
