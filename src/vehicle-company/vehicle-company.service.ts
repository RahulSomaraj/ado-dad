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

@Injectable()
export class VehicleCompanyService {
  constructor(
    @InjectModel(VehicleCompany.name)
    private readonly vehicleCompanyModel: Model<VehicleCompany>, // ✅ Inject Model
  ) {}

  async create(createVCDto: CreateVehicleCompanyDto): Promise<VehicleCompany> {
    // Check if a vehicle company with the same name already exists in the database
    const existingCompany = await this.vehicleCompanyModel.findOne({
      name: createVCDto.name,
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

    // If not, create a new vehicle company
    const vehicleCompany = {
      name: createVCDto.name,
      originCountry: createVCDto.originCountry,
      logo: createVCDto.logo,
    };

    const newCompany = new this.vehicleCompanyModel(vehicleCompany);
    return newCompany.save();
  }

  async findAll(query: FindVehicleCompaniesDto) {
    // Example pseudo-code: build filter based on provided query properties
    const filter: any = {};
    if (query.name) {
      filter.name = { $regex: new RegExp(query.name, 'i') };
    }
    if (query.originCountry) {
      filter.originCountry = { $regex: new RegExp(query.originCountry, 'i') };
    }
    // Replace with actual database logic (e.g., using Mongoose or TypeORM)
    return await this.vehicleCompanyModel.find(filter);
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
    return this.vehicleCompanyModel.findByIdAndDelete(id).exec();
  }
}
