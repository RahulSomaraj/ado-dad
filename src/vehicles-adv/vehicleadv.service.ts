import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VehicleAdv } from './schemas/vehicleadv.schema';
import { CreateVehicleAdvDto } from './dto/create-vehicle-adv.dto';
import { VehicleCompany } from 'src/vehicle-company/schemas/schema.vehicle-company';
import { UpdateVehicleAdvDto } from './dto/update-vehicle.dto';
import { FindVehicleDto } from './dto/get-vehicle-adv.dto';
import { Vehicle } from 'src/vehicles/schemas/vehicle.schema';

@Injectable()
export class VehicleAdvService {
  constructor(
    @InjectModel(VehicleAdv.name) private vehicleModel: Model<VehicleAdv>,
    @InjectModel(VehicleCompany.name)
    private vehicleCompanyModel: Model<VehicleCompany>,
  ) {}

  async findVehicles(findDto: FindVehicleDto): Promise<VehicleAdv[]> {
    const filter: any = {};

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
      // Additional info nested filter
      if (findDto.vehicleModel.additionalInfo) {
        const additionalInfoQuery: any = {};
        if (findDto.vehicleModel.additionalInfo.abs !== undefined) {
          additionalInfoQuery.abs = findDto.vehicleModel.additionalInfo.abs;
        }
        // Add more additional info filters as needed...
        if (Object.keys(additionalInfoQuery).length > 0) {
          vmQuery.additionalInfo = additionalInfoQuery;
        }
      }
      filter.vehicleModels = { $elemMatch: vmQuery };
    }

    // Pagination: Default values are provided by PaginationDto if not present.
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

  async getVehicleById(id: string): Promise<VehicleAdv | null> {
    return this.vehicleModel
      .findById(id)
      .populate('vendor') // populate the top-level vendor (VehicleCompany)
      .populate({
        path: 'vehicleModels.additionalInfo.vendor', // populate the nested vendor field
        model: 'VehicleCompany', // adjust this if the nested vendor references a different model
      })
      .exec();
  }

  async createVehicle(
    createVehicleDto: CreateVehicleAdvDto,
  ): Promise<VehicleAdv> {
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

    // Build the vehicle object manually (adding other required fields from the DTO).
    const vehicleData = {
      name: createVehicleDto.name,
      modelName: createVehicleDto.modelName,
      details: createVehicleDto.details,
      vendor: createVehicleDto.vendor, // Relation to a VehicleCompany document.
      vehicleModels: createVehicleDto.vehicleModels,
    };

    const newVehicle = new this.vehicleModel(vehicleData);
    return newVehicle.save();
  }

  async updateVehicle(
    id: string,
    updateVehicleDto: UpdateVehicleAdvDto, // Assume UpdateVehicleDto is defined with optional fields
  ): Promise<VehicleAdv> {
    // Retrieve the existing vehicle by its ID
    const vehicle = await this.vehicleModel.findById(id);
    if (!vehicle) {
      throw new HttpException(
        { status: HttpStatus.NOT_FOUND, error: 'Vehicle not found.' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Validate uniqueness of the vehicle name if a new name is provided.
    // Ensure that any found vehicle with the same name is not the one being updated.
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

    // Validate vehicleModels if provided: ensure at least one model is present.
    if (
      updateVehicleDto.vehicleModels &&
      updateVehicleDto.vehicleModels.length === 0
    ) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'At least one vehicle model is required.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Merge update fields into the existing vehicle document.
    Object.assign(vehicle, updateVehicleDto);
    return vehicle.save();
  }

  async deleteVehicle(id: string): Promise<void> {
    await this.vehicleModel.findByIdAndDelete(id);
  }
}
