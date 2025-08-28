import { ApiProperty } from '@nestjs/swagger';

export class ManufacturerResponseDto {
  @ApiProperty({
    description: 'Manufacturer ID',
    example: '686011b01bba6a053e0be845',
  })
  _id: string;

  @ApiProperty({
    description: 'Manufacturer name (unique identifier)',
    example: 'honda',
  })
  name: string;

  @ApiProperty({
    description: 'Manufacturer display name',
    example: 'Honda',
  })
  displayName: string;

  @ApiProperty({
    description: 'Country of origin',
    example: 'Japan',
  })
  originCountry: string;

  @ApiProperty({
    description: 'Manufacturer description',
    example:
      'Japanese multinational known for automobiles, motorcycles, and power equipment',
  })
  description: string;

  @ApiProperty({
    description: 'Manufacturer logo URL',
    example: 'https://example.com/logos/honda.png',
  })
  logo: string;

  @ApiProperty({
    description: 'Manufacturer website',
    example: 'https://www.honda.com',
  })
  website: string;

  @ApiProperty({
    description: 'Year the company was founded',
    example: 1948,
  })
  foundedYear: number;

  @ApiProperty({
    description: 'Company headquarters location',
    example: 'Tokyo, Japan',
  })
  headquarters: string;

  @ApiProperty({
    description: 'Whether the manufacturer is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Whether the manufacturer is premium',
    example: false,
  })
  isPremium: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-06-28T16:00:48.971Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-06-28T16:00:48.971Z',
  })
  updatedAt: string;
}

export class PaginatedManufacturerResponseDto {
  @ApiProperty({
    description: 'Array of manufacturers',
    type: [ManufacturerResponseDto],
  })
  data: ManufacturerResponseDto[];

  @ApiProperty({
    description: 'Total number of manufacturers',
    example: 32,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 2,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrev: boolean;
}
