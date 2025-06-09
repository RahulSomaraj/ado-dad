import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle } from './schemas/vehicle.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { VehicleCompany } from 'src/vehicle-company/schemas/schema.vehicle-company';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { FindVehicleDto } from './dto/get-vehicle.dto';
import { VehicleTypes, WheelerType } from './enum/vehicle.type';

@Injectable()
export class VehicleService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
    @InjectModel(VehicleCompany.name)
    private vehicleCompanyModel: Model<VehicleCompany>,
  ) {}

  async findVehicles(findDto: FindVehicleDto): Promise<Vehicle[]> {
    const filter: any = {
       deletedAt: null,
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
  
    // Sorting
    const sortOrder = findDto.sort === 'asc' ? 1 : -1; // Default: Descending
    console.log(filter);
  
    return this.vehicleModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: sortOrder }) // <-- Sorting added here
      .populate('vendor')
      .exec();
  }
  
  async getVehicleById(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleModel
      .findById(id)
      .populate('vendor') // populate the top-level vendor (VehicleCompany)
      .populate({
        path: 'vehicleModels.additionalInfo.vendor', // populate the nested vendor field
        model: 'VehicleCompany', // adjust this if the nested vendor references a different model
      })
      .exec();

    // Throw an exception if no vehicle is found
    if (!vehicle) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Vehicle not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Throw an exception if the top-level vendor is missing
    if (!vehicle.vendor) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Vehicle company (vendor) not found.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return vehicle;
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
      vendor: createVehicleDto.vendor,
      vehicleModels: createVehicleDto.vehicleModels,
      color: createVehicleDto.color,
    };

    const newVehicle = new this.vehicleModel(vehicleData);
    return newVehicle.save();
  }

  async updateVehicle(
    id: string,
    updateVehicleDto: UpdateVehicleDto, // Assume UpdateVehicleAdvDto has optional fields
  ): Promise<Vehicle> {
    // Retrieve the existing vehicle by its ID
    const vehicle = await this.vehicleModel.findById(id);
    if (!vehicle) {
      throw new HttpException(
        { status: HttpStatus.NOT_FOUND, error: 'Vehicle not found.' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Validate uniqueness of the vehicle name if a new name is provided.
    if (updateVehicleDto.name) {
      const existingVehicle: any = await this.vehicleModel.findOne({
        name: updateVehicleDto.name,
      });
      if (existingVehicle && existingVehicle._id.toString() !== id) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Vehicle with this name already exists.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Validate vendor if provided: ensure the referenced VehicleCompany exists.
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

    // Validate and merge vehicleModels if provided.
    if (updateVehicleDto.vehicleModels) {
      // If an empty array is provided, throw an error.
      if (updateVehicleDto.vehicleModels.length === 0) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'At least one vehicle model is required.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate that new vehicle models do not contain duplicates.
      const newModelKeys = new Set<string>();
      for (const newModel of updateVehicleDto.vehicleModels) {
        const key = `${newModel.name}-${newModel.modelName}-${newModel.transmissionType}-${newModel.fuelType}`;
        if (newModelKeys.has(key)) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              error:
                'Duplicate vehicle model found with the same combination of name, model name, transmission type, and fuel type.',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        newModelKeys.add(key);
      }

      // Delete all existing vehicle models and replace with the new ones.
      vehicle.vehicleModels = updateVehicleDto.vehicleModels;
    }

    // Overwrite the vehicleModels field with the merged array.

    // Merge update fields into the existing vehicle document.
    Object.assign(vehicle, updateVehicleDto);
    return vehicle.save();
  }

  async softDeleteVehicle(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleModel.findById(id);
    if (!vehicle) {
      throw new HttpException(
        { status: HttpStatus.NOT_FOUND, error: 'Vehicle not found.' },
        HttpStatus.NOT_FOUND,
      );
    }
    // Mark the vehicle as deleted by setting the deletedAt field to the current date.
    vehicle.deletedAt = new Date();
    return vehicle.save();
  }
}
