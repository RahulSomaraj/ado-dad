import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, VehicleDocument } from './schemas/vehicle.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import {
  VehicleCompany,
  VehicleCompanyDocument,
} from 'src/vehicle-company/schemas/schema.vehicle-company';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { FindVehicleDto } from './dto/get-vehicle.dto';
import { VehicleTypes, WheelerType } from './enum/vehicle.type';

@Injectable()
export class VehicleService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
    @InjectModel(VehicleCompany.name)
    private vehicleCompanyModel: Model<VehicleCompanyDocument>,
  ) {}

  async findVehicles(
    query: any,
  ): Promise<{ vehicleCompanies: any[]; vehicles: any[] }> {
    const filter: any = { deletedAt: null };

    const isFiltered = !!query.modelVehicleName?.trim(); // Add more flags if needed

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

    let vehicleCompanies;

    if (isFiltered) {
      const vendorIds = vehicles
        .map((v) => v.vendor?.toString())
        .filter(Boolean);
      const uniqueVendorIds = [...new Set(vendorIds)];

      vehicleCompanies = await this.vehicleCompanyModel.find({
        _id: { $in: uniqueVendorIds },
        deletedAt: null,
      });
    } else {
      vehicleCompanies = await this.vehicleCompanyModel.find({
        deletedAt: null,
      });
    }

    return {
      vehicleCompanies,
      vehicles,
    };
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

  async createVehicle(
    createVehicleDto: CreateVehicleDto,
    user: any,
  ): Promise<Vehicle> {
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
    user: any,
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

  async softDeleteVehicle(id: string, user: any): Promise<Vehicle> {
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

// Utility to escape special regex characters
function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
