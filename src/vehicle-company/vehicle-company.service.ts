import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  AnyObject,
  ClientSession,
  Document,
  DocumentSetOptions,
  Error,
  FlattenMaps,
  MergeType,
  Model,
  ModifiedPathsSnapshot,
  pathsToSkip,
  PopulateOptions,
  Query,
  QueryOptions,
  SaveOptions,
  ToObjectOptions,
  Types,
  UpdateQuery,
  UpdateWithAggregationPipeline,
} from 'mongoose';
import { VehicleCompany } from './schemas/schema.vehicle-company';
import { CreateVehicleCompanyDto } from './dto/create-vehicle-company.dto';
import { UpdateVehicleCompanyDto } from './dto/update-vehicle-company.dto';
import { FindVehicleCompaniesDto } from './dto/get-vehicle-company.dto';
import { VehicleTypes } from 'src/vehicles/enum/vehicle.type';

@Injectable()
export class VehicleCompanyService {
  constructor(
    @InjectModel(VehicleCompany.name)
    private readonly vehicleCompanyModel: Model<VehicleCompany>, // ✅ Inject Model
  ) {}

  async create(createVCDto: CreateVehicleCompanyDto): Promise<VehicleCompany> {
    // Check if a vehicle company with the same name already exists in the database
    const existingCompany = await this.vehicleCompanyModel.findOne({
      name: { $regex: new RegExp(`^${createVCDto.name}$`, 'i') },
      vehicleType: createVCDto.vehicleType,
    });

    if (existingCompany) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Vehicle company with this name already exists.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // If not, create a new vehicle company using consistent field names
    const vehicleCompany = {
      name: createVCDto.name,
      originCountry: createVCDto.originCountry,
      logo: createVCDto.logo,
      vehicleType: createVCDto.vehicleType, // Use 'vehicleType' consistently
    };

    const newCompany = new this.vehicleCompanyModel(vehicleCompany);
    return newCompany.save();
  }
  async findAll(query: FindVehicleCompaniesDto) {
    // Build filter based on provided query properties
    const filter: any = {};
    if (query.name) {
      filter.name = { $regex: new RegExp(query.name, 'i') };
    }
    if (query.originCountry) {
      filter.originCountry = { $regex: new RegExp(query.originCountry, 'i') };
    }
  
    // Exclude soft-deleted documents:
    filter.deletedAt = null;
  
    // Set pagination defaults if not provided
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;
  
    // Determine sorting order (default to newest first)
    const sortOrder = query.sort === 'asc' ? 1 : -1;
  
    // Execute the query and count in parallel
    const [results, total] = await Promise.all([
      this.vehicleCompanyModel
        .find(filter, null, { withDeleted: false })
        .sort({ createdAt: sortOrder }) // Sorting by createdAt
        .skip(skip)
        .limit(limit)
        .exec(),
      this.vehicleCompanyModel.countDocuments(filter),
    ]);
  
    // Return paginated result with metadata
    return {
      data: results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  

  async findOne(id: string): Promise<VehicleCompany | null> {
    return this.vehicleCompanyModel.findById(id).exec();
  }

  async update(
    id: string,
    updateVCDto: UpdateVehicleCompanyDto,
  ): Promise<VehicleCompany> {
    // Find the existing vehicle company by its ID
    const vehicleCompany = await this.vehicleCompanyModel.findById(id);
    if (!vehicleCompany) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Vehicle company with id ${id} not found`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // If a new name is provided and it's different from the current name,
    // check if another vehicle company with that name already exists
    if (updateVCDto.name && updateVCDto.name !== vehicleCompany.name) {
      const existingCompany = await this.vehicleCompanyModel.findOne({
        name: updateVCDto.name,
        vehicleType: updateVCDto.vehicleType ?? vehicleCompany.vehicleType,
      });
      if (existingCompany) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Vehicle company with this name already exists.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Merge the updated fields into the existing company object
    Object.assign(vehicleCompany, updateVCDto);

    // Save and return the updated vehicle company
    return vehicleCompany.save();
  }

  async remove(id: string): Promise<VehicleCompany | null> {
    return this.vehicleCompanyModel
      .findByIdAndUpdate(
        id,
        { isDeleted: true, deletedAt: new Date() },
        { new: true },
      )
      .exec();
  }
}
