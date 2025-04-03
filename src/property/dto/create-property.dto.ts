import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateIf,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PropertyTypeEnum {
  house = 'house',
  apartment = 'apartment',
  shopAndOffice = 'shopAndOffice',
  pgAndGuestHouse = 'pgAndGuestHouse',
  land = 'land',
}

export enum PropertyCategoryEnum {
  forSale = 'forSale',
  forRent = 'forRent',
  landsAndPlots = 'landsAndPlots',
}

export enum FurnishedEnum {
  Furnished = 'Furnished',
  SemiFurnished = 'Semi-Furnished',
  Unfurnished = 'Unfurnished',
}

export enum ProjectStatusEnum {
  UnderConstruction = 'Under Construction',
  ReadyToMove = 'Ready to Move',
  Resale = 'Resale',
}

export enum FacingEnum {
  North = 'North',
  South = 'South',
  East = 'East',
  West = 'West',
  NorthEast = 'North-East',
  NorthWest = 'North-West',
  SouthEast = 'South-East',
  SouthWest = 'South-West',
}

export enum ListedByEnum {
  Owner = 'Owner',
  Dealer = 'Dealer',
  Builder = 'Builder',
}

export class CreatePropertyDto {
  @ApiProperty({ description: 'Type of property', enum: PropertyTypeEnum })
  @IsEnum(PropertyTypeEnum)
  @IsNotEmpty()
  propertyType: PropertyTypeEnum;

  @ApiProperty({
    description: 'Category of property',
    enum: PropertyCategoryEnum,
  })
  @IsEnum(PropertyCategoryEnum)
  @IsNotEmpty()
  adType: PropertyCategoryEnum;

  // Conditional: For house, apartment, pgAndGuestHouse, require bhk.
  @ApiPropertyOptional({
    description:
      'BHK count (required for house, apartment, and pgAndGuestHouse types)',
    minimum: 1,
  })
  @ValidateIf((o) =>
    [
      PropertyTypeEnum.house,
      PropertyTypeEnum.apartment,
      PropertyTypeEnum.pgAndGuestHouse,
    ].includes(o.type),
  )
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  bhk?: number;

  // Conditional: For house, apartment, pgAndGuestHouse, require bathrooms.
  @ApiPropertyOptional({
    description:
      'Number of bathrooms (required for house, apartment, and pgAndGuestHouse types)',
    minimum: 1,
  })
  @ValidateIf((o) =>
    [
      PropertyTypeEnum.house,
      PropertyTypeEnum.apartment,
      PropertyTypeEnum.pgAndGuestHouse,
    ].includes(o.type),
  )
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  bathrooms?: number;

  // @ApiProperty({ description: 'Owner ID' })
  // @IsMongoId()
  // @IsNotEmpty()
  // owner: string;

  // Conditional: For house, apartment, pgAndGuestHouse, require furnished status.
  @ApiPropertyOptional({
    description:
      'Furnished status (required for house, apartment, and pgAndGuestHouse types)',
    enum: FurnishedEnum,
  })
  @ValidateIf((o) =>
    [
      PropertyTypeEnum.house,
      PropertyTypeEnum.apartment,
      PropertyTypeEnum.pgAndGuestHouse,
    ].includes(o.type),
  )
  @IsEnum(FurnishedEnum)
  furnished?: FurnishedEnum;

  // Conditional: For non-land properties, require project status.
  @ApiPropertyOptional({
    description: 'Project status (required if property type is not land)',
    enum: ProjectStatusEnum,
  })
  @ValidateIf((o) => o.propertyType !== PropertyTypeEnum.land)
  @IsEnum(ProjectStatusEnum)
  projectStatus?: ProjectStatusEnum;

  @ApiPropertyOptional({ description: 'Maintenance cost', default: 0 })
  @IsNumber()
  @Type(() => Number)
  maintenanceCost?: number;

  // Conditional: For house, apartment, pgAndGuestHouse, require total floors.
  @ApiPropertyOptional({
    description:
      'Total number of floors (required for house, apartment, and pgAndGuestHouse types)',
    minimum: 1,
  })
  @ValidateIf((o) =>
    [
      PropertyTypeEnum.house,
      PropertyTypeEnum.apartment,
      PropertyTypeEnum.pgAndGuestHouse,
    ].includes(o.type),
  )
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  totalFloors?: number;

  // Conditional: For house, apartment, pgAndGuestHouse, require floor number.
  @ApiPropertyOptional({
    description:
      'Floor number (required for house, apartment, and pgAndGuestHouse types)',
    minimum: 0,
  })
  @ValidateIf((o) =>
    [
      PropertyTypeEnum.house,
      PropertyTypeEnum.apartment,
      PropertyTypeEnum.pgAndGuestHouse,
    ].includes(o.type),
  )
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  floorNo?: number;

  @ApiPropertyOptional({
    description: 'Car parking count',
    default: 0,
    minimum: 0,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  carParking?: number;

  @ApiPropertyOptional({
    description: 'Facing direction',
    enum: FacingEnum,
  })
  @IsEnum(FacingEnum)
  facing?: FacingEnum;

  @ApiProperty({ description: 'Category of property' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Created by (User ID)' })
  @IsMongoId()
  @IsNotEmpty()
  createdBy: string;

  @ApiProperty({ description: 'Listed by', enum: ListedByEnum })
  @IsEnum(ListedByEnum)
  @IsNotEmpty()
  listedBy: ListedByEnum;
}
