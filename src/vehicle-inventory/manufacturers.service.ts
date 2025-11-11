import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { PipelineStage, Query, SortOrder } from 'mongoose';
import {
  Manufacturer,
  ManufacturerDocument,
} from './schemas/manufacturer.schema';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { UpdateManufacturerDto } from './dto/update-manufacturer.dto';
import { FilterManufacturerDto } from './dto/filter-manufacturer.dto';
import { PaginatedManufacturerResponseDto } from './dto/manufacturer-response.dto';
import { RedisService } from '../shared/redis.service';
import { parseFile } from 'src/utils/file-parser.util'; 

@Injectable()
export class ManufacturersService {
  private static readonly CACHE_PREFIX = 'vi:manufacturers:';
  private static readonly CACHE_TTL = {
    LIST_SHORT: 180, // 3 minutes (frequent UI queries)
    LIST_MED: 300, // 5 minutes
    LOOKUPS: 600, // 10 minutes
  } as const;

  private cacheVersion = 1; // bump to invalidate broadly

  constructor(
    @InjectModel(Manufacturer.name)
    private readonly manufacturerModel: Model<ManufacturerDocument>,
    private readonly redisService: RedisService,
  ) {}

  // ---- helpers ------------------------------------------------------------
  private key(parts: Record<string, unknown>): string {
    const norm = Object.keys(parts)
      .filter(
        (k) => parts[k] !== undefined && parts[k] !== null && parts[k] !== '',
      )
      .sort()
      .map((k) => `${k}=${JSON.stringify(parts[k])}`)
      .join('&');
    return `${ManufacturersService.CACHE_PREFIX}v${this.cacheVersion}:${norm}`;
  }

  private normalize(obj: any): any {
    if (obj == null) return obj;
    if (Array.isArray(obj)) return obj.map((v) => this.normalize(v));
    if (typeof obj === 'object') {
      const entries = Object.entries(obj)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, this.normalize(v)]);
      return Object.fromEntries(entries);
    }
    return obj;
  }

  private oid(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Invalid ID format: ${id}. Expected a valid MongoDB ObjectId.`,
      );
    }
    return new Types.ObjectId(id);
  }

  private async invalidateManufacturerCaches(): Promise<void> {
    try {
      this.cacheVersion++; // coarse global bust
      const patterns = [`${ManufacturersService.CACHE_PREFIX}*`];
      for (const p of patterns) {
        const keys = await this.redisService.keys(p);
        if (keys?.length)
          await Promise.all(keys.map((k) => this.redisService.cacheDel(k)));
      }
    } catch {
      // non-fatal
    }
  }

  private clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
  }

  private coerceSort(
    sortBy?: string,
    sortOrder?: string,
  ): { field: string; dir: 1 | -1 } {
    const allowed: Record<string, 1> = {
      name: 1,
      foundedYear: 1,
      originCountry: 1,
      createdAt: 1,
      updatedAt: 1,
    };
    const field = sortBy && allowed[sortBy] ? sortBy : 'name';
    const dir: 1 | -1 = sortOrder === 'DESC' ? -1 : 1;
    return { field, dir };
  }

  // Manufacturer CRUD methods
  async createManufacturer(
    createManufacturerDto: CreateManufacturerDto,
  ): Promise<Manufacturer> {
    try {
      const manufacturer = new this.manufacturerModel(createManufacturerDto);
      const savedManufacturer = await manufacturer.save();

      // Invalidate caches after creation
      await this.invalidateManufacturerCaches();

      return savedManufacturer;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        const field = Object.keys(error.keyPattern)[0];
        throw new BadRequestException(
          `Manufacturer with ${field} '${error.keyValue[field]}' already exists`,
        );
      }
      if (error.name === 'ValidationError') {
        // Mongoose validation error
        const validationErrors = Object.values(error.errors).map(
          (err: any) => err.message,
        );
        throw new BadRequestException(
          `Validation failed: ${validationErrors.join(', ')}`,
        );
      }
      throw error;
    }
  }

  async findAllManufacturers(): Promise<Manufacturer[]> {
    const cacheKey = this.key({ type: 'all' });
    const cached = await this.redisService.cacheGet<Manufacturer[]>(cacheKey);
    if (cached) return cached;

    const data = await this.manufacturerModel
      // show ALL non-deleted by default (inactive included)
      .find({ isDeleted: false })
      .collation({ locale: 'en', strength: 2 })
      .sort({ name: 1 })
      .lean()
      .exec();

    await this.redisService.cacheSet(
      cacheKey,
      data,
      ManufacturersService.CACHE_TTL.LOOKUPS,
    );
    return data;
  }

  async findManufacturerById(id: string): Promise<Manufacturer> {
    const cacheKey = this.key({ type: 'byId', id });
    const cached = await this.redisService.cacheGet<Manufacturer>(cacheKey);
    if (cached) return cached;

    const manufacturer = await this.manufacturerModel
      // byId should return any non-deleted doc, even if inactive
      .findOne({ _id: this.oid(id), isDeleted: false })
      .lean()
      .exec();

    if (!manufacturer) {
      throw new NotFoundException(`Manufacturer with id ${id} not found`);
    }

    await this.redisService.cacheSet(
      cacheKey,
      manufacturer,
      ManufacturersService.CACHE_TTL.LOOKUPS,
    );
    return manufacturer;
  }

  async updateManufacturer(
    id: string,
    updateManufacturerDto: UpdateManufacturerDto,
  ): Promise<Manufacturer> {
    try {
      const manufacturer = await this.manufacturerModel
        .findOneAndUpdate(
          { _id: this.oid(id), isDeleted: false },
          { $set: updateManufacturerDto },
          { new: true, runValidators: true },
        )
        .lean()
        .exec();

      if (!manufacturer) {
        throw new NotFoundException(`Manufacturer with id ${id} not found`);
      }

      // Invalidate caches after update
      await this.invalidateManufacturerCaches();

      return manufacturer;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException(
          'Manufacturer with this name already exists',
        );
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async deleteManufacturer(id: string): Promise<{ message: string }> {
    const manufacturer = await this.manufacturerModel
      .findOneAndUpdate(
        { _id: this.oid(id), isDeleted: false },
        { $set: { isDeleted: true, isActive: false } },
        { new: true },
      )
      .lean()
      .exec();

    if (!manufacturer) {
      throw new NotFoundException(`Manufacturer with id ${id} not found`);
    }

    // Invalidate caches after deletion
    await this.invalidateManufacturerCaches();

    return { message: 'Manufacturer deleted successfully' };
  }

  async findManufacturersWithFilters(
    filters: FilterManufacturerDto,
  ): Promise<PaginatedManufacturerResponseDto> {
    const cacheKey = this.key({ type: 'filtered', ...this.normalize(filters) });
    const cached =
      await this.redisService.cacheGet<PaginatedManufacturerResponseDto>(
        cacheKey,
      );
    if (cached) return cached;

    let { page = 1, limit = 20, sortBy = 'name', sortOrder = 'ASC' } = filters;
    const { field: sortField, dir: sortDir } = this.coerceSort(
      sortBy,
      sortOrder,
    );
    const pageNum = this.clamp(
      typeof page === 'string' ? parseInt(page, 10) : page,
      1,
      1e9,
    );
    const limitNum = this.clamp(
      typeof limit === 'string' ? parseInt(limit, 10) : limit,
      1,
      100,
    );

    // Build the aggregation pipeline
    const pipeline: PipelineStage[] = [];

    // Handle text search first (must be the first stage if present)
    if (filters.search && filters.search.trim()) {
      pipeline.push({
        $match: {
          $text: { $search: filters.search },
        },
      });
    }

    // Add basic filters
    const matchStage: any = { isDeleted: false };

    if (filters.originCountry) {
      matchStage.originCountry = {
        $regex: filters.originCountry,
        $options: 'i',
      };
    }

    if (filters.minFoundedYear !== undefined) {
      const minYear =
        typeof filters.minFoundedYear === 'string'
          ? parseInt(filters.minFoundedYear, 10)
          : filters.minFoundedYear;
      matchStage.foundedYear = {
        ...matchStage.foundedYear,
        $gte: minYear,
      };
    }

    if (filters.maxFoundedYear !== undefined) {
      const maxYear =
        typeof filters.maxFoundedYear === 'string'
          ? parseInt(filters.maxFoundedYear, 10)
          : filters.maxFoundedYear;
      matchStage.foundedYear = {
        ...matchStage.foundedYear,
        $lte: maxYear,
      };
    }

    if (filters.headquarters) {
      matchStage.headquarters = { $regex: filters.headquarters, $options: 'i' };
    }

    if (filters.isActive !== undefined) {
      matchStage.isActive = filters.isActive;
    }

    // Add category filtering based on manufacturer characteristics
    if (filters.category) {
      const categoryFilters = this.getCategoryFilter(filters.category);
      if (categoryFilters.length > 0) {
        matchStage.$or = categoryFilters;
      }
    }

    // Add region filtering
    if (filters.region) {
      const regionCountries = this.getRegionCountries(filters.region);
      if (regionCountries.length > 0) {
        // If originCountry regex also provided, intersect via $and
        if (matchStage.originCountry) {
          pipeline.push({
            $match: {
              $and: [
                { originCountry: { $in: regionCountries } },
                { originCountry: matchStage.originCountry },
              ],
            },
          });
          delete matchStage.originCountry;
        } else {
          matchStage.originCountry = { $in: regionCountries };
        }
      }
    }

    pipeline.push({ $match: matchStage });

    // Use $facet to get both data and total in a single aggregation
    const facetPipeline: PipelineStage[] = [
      {
        $facet: {
          data: [
            { $sort: { [sortField]: sortDir } },
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ];

    // Execute the aggregation
    const [result] = await this.manufacturerModel
      .aggregate([...pipeline, ...facetPipeline])
      .collation({ locale: 'en', strength: 2 });

    const manufacturers = result.data || [];
    const total = result.total?.[0]?.count || 0;

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    const response: PaginatedManufacturerResponseDto = {
      data: manufacturers,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNext,
      hasPrev,
    };

    await this.redisService.cacheSet(
      cacheKey,
      response,
      ManufacturersService.CACHE_TTL.LIST_MED,
    );
    return response;
  }

  // Helper methods for filtering
  private getCategoryFilter(category: string): any[] {
    const categoryMappings = {
      passenger_car: [
        {
          name: {
            $in: [
              'maruti_suzuki',
              'tata_motors',
              'honda',
              'toyota',
              'hyundai',
              'kia',
              'volkswagen',
              'ford',
              'chevrolet',
              'skoda',
              'mg_motor',
              'haval',
            ],
          },
        },
      ],
      two_wheeler: [
        {
          name: {
            $in: [
              'hero_moto',
              'bajaj_auto',
              'tvs_motor',
              'honda',
              'yamaha',
              'kawasaki',
              'suzuki',
            ],
          },
        },
      ],
      commercial_vehicle: [
        {
          name: {
            $in: [
              'ashok_leyland',
              'eicher_motors',
              'force_motors',
              'bharat_benz',
              'tata_daewoo',
              'tata_motors',
              'mahindra',
            ],
          },
        },
      ],
      luxury: [{ name: { $in: ['bmw', 'mercedes_benz', 'audi', 'volvo'] } }],
      suv: [{ name: { $in: ['mahindra', 'jeep', 'haval', 'mg_motor'] } }],
    };

    return categoryMappings[category] || [];
  }

  private getRegionCountries(region: string): string[] {
    const regionMappings = {
      Asia: ['India', 'Japan', 'South Korea', 'China'],
      Europe: ['Germany', 'Sweden', 'Czech Republic'],
      'North America': ['United States'],
      'South America': [],
      Africa: [],
      Oceania: [],
    };

    return regionMappings[region] || [];
  }

  // Cache management methods
  async getCacheVersion(): Promise<number> {
    return this.cacheVersion;
  }

  async forceCacheInvalidation(): Promise<void> {
    await this.invalidateManufacturerCaches();
  }

async createManufacturerFromCsv(buffer: Buffer, fileType: 'csv') {
  const rows = (await parseFile(buffer, fileType)) as Record<string, any>[];

  if (!rows || rows.length === 0) {
    throw new BadRequestException("Empty or Invalid CSV file");
  }

  const seen = new Set<string>();
  const uniqueRows: Record<string, any>[] = [];

  for (const row of rows) {
    if (!row.name || typeof row.name !== 'string') continue;
    const key = row.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    uniqueRows.push(row);
  }

  const existing = await this.manufacturerModel
    .find({ name: { $in: uniqueRows.map((r) => r.name) } })
    .select('name')
    .lean();

  const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));

  const skipped: Record<string, any>[] = [];
  const finalRows = uniqueRows.filter((r) => {
    if (existingNames.has(r.name.toLowerCase())) {
      skipped.push({ row: r, reason: 'Already exists in database' });
      return false;
    }
    return true;
  });

  if (finalRows.length === 0) {
    return {
      totalRows: rows.length,
      uniqueRows: uniqueRows.length,
      insertedCount: 0,
      skippedCount: skipped.length,
      inserted: [],
      skipped,
      message: "All manufacturers already exist in the database.",
    };
  }

  const insertedDocs = await this.manufacturerModel.insertMany(finalRows);

  return {
    totalRows: rows.length,
    uniqueRows: uniqueRows.length,
    insertedCount: insertedDocs.length,
    skippedCount: skipped.length,
    inserted: insertedDocs,
    skipped,
  };
}



}
