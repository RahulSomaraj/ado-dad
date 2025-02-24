import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ArrayNotEmpty,
  ValidateNested,
  Min,
} from 'class-validator';
import { CreatePropertyDto } from 'src/property/dto/create-property.dto';
import { CreateVehicleAdvDto } from 'src/vehicles-adv/dto/create-vehicle-adv.dto';
import {
  FuelType,
  TransmissionType,
  VehicleTypes,
  WheelerType,
} from 'src/vehicles/enum/vehicle.type';

export enum AdvertisementType {
  Vehicle = 'Vehicle',
  Property = 'Property',
}

export class CreateAdvertisementDto {
  @ApiProperty({
    enum: AdvertisementType,
    description: 'Type of advertisement. Allowed values: Vehicle, Property',
  })
  @IsEnum(AdvertisementType)
  type: AdvertisementType;

  @ApiProperty({
    enum: VehicleTypes,
    description: 'Type of vehicls. Allowed values: Car',
  })
  @IsEnum(VehicleTypes)
  modelType: VehicleTypes;

  @ApiProperty({ description: 'Title of the advertisement' })
  @IsString()
  @IsNotEmpty()
  adTitle: string;

  @ApiProperty({ description: 'Description of the advertisement' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description:
      'Price in rupees. This value can be very large, so it is transformed to a number.',
    example: 1000000000, // example in rupees
  })
  @IsNotEmpty({ message: 'Price is required.' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a valid number.' })
  @Min(0, { message: 'Price must be at least 0.' })
  price: number;

  @ApiProperty({
    description: 'Image URLs for the advertisement',
    isArray: true,
    type: String,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  imageUrls: string[];

  @ApiProperty({ description: 'State where the advertisement is posted' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'City where the advertisement is posted' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'City where the advertisement is posted' })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiPropertyOptional({
    description: 'Approval status of the advertisement',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  // @ApiProperty({
  //   description: 'User ID of the approver',
  //   example: '609c1d1f4f1a2561d8e6b456',
  // })
  // @IsMongoId()
  // @IsNotEmpty()
  // approvedBy: string;

  @ApiProperty({
    description: 'Category ID for the advertisement',
    example: '609c1d1f4f1a2561d8e6b789',
  })
  @IsMongoId()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    description: 'Vehicle reference. Required if type is "Vehicle".',
    example: {
      name: 'Toyota',
      modelName: 'Camry',
      modelType: VehicleTypes.SEDAN, // from VehicleTypes enum
      wheelerType: WheelerType.TWO_WHEELER, // from WheelerType enum
      color: 'Red',
      details: {
        modelYear: 2023,
        month: 'March',
      },
      vendor: '67b349d2c0ec145884f86926',
      vehicleModel: {
        name: 'Model X',
        modelName: 'X1',
        modelDetails: 'Latest model details',
        fuelType: FuelType.PETROL, // from FuelType enum
        transmissionType: TransmissionType.AUTOMATIC, // from TransmissionType enum
        mileage: 15,
        engineCapacity: 15,
        fuelCapacity: 15,
        maxPower: 15,
        additionalInfo: {
          abs: true,
          accidental: true,
          adjustableExternalMirror: true,
          adjustableSteering: false,
          adjustableSeats: true,
          airConditioning: true,
          numberOfAirbags: 6,
          alloyWheels: true,
          auxCompatibility: true,
          batteryCondition: 'Good',
          bluetooth: true,
          vehicleCertified: true,
          cruiseControl: true,
          insuranceType: 'Full Coverage',
          lockSystem: true,
          makeMonth: 'January',
          navigationSystem: true,
          parkingSensors: true,
          powerSteering: true,
          powerWindows: true,
          amFmRadio: true,
          rearParkingCamera: true,
          registrationPlace: 'New York',
          exchange: true,
          finance: true,
          serviceHistory: true,
          sunroof: true,
          tyreCondition: 'Good',
          usbCompatibility: true,
          seatWarmer: true,
        },
      },
    },
  })
  @ValidateIf((o) => o.type === AdvertisementType.Vehicle)
  @IsNotEmpty({
    message: 'Vehicle reference is required for Vehicle type ads.',
  })
  @ValidateNested()
  @Type(() => CreateVehicleAdvDto)
  vehicle?: CreateVehicleAdvDto;

  @ApiPropertyOptional({
    description: 'Property reference. Required if type is "Property".',
    example: {
      propertyType: 'house',
      adType: 'forSale',
      bhk: 3,
      bathrooms: 2,
      furnished: 'Furnished',
      projectStatus: 'Ready to Move',
      maintenanceCost: 0,
      totalFloors: 10,
      floorNo: 5,
      carParking: 1,
      facing: 'North',
      listedBy: 'Owner',
    },
  })
  @ValidateIf((o) => o.type === AdvertisementType.Property)
  @IsNotEmpty({
    message: 'Property reference is required for Property type ads.',
  })
  @ValidateNested()
  @Type(() => CreatePropertyDto)
  property?: CreatePropertyDto;
}
