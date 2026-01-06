import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { PipelineStage, Query, SortOrder, FilterQuery } from 'mongoose';
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

  // Case-insensitive prefix matcher that anchors at start or after separators
  private buildPrefixRegex(term: string): RegExp {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[\\s_\\-])${escaped}`, 'i');
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

  private parseBoolean(value: any, defaultValue = false): boolean {
    if (value === undefined || value === null) return defaultValue;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return defaultValue;
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    return defaultValue;
  }

  // Manufacturer CRUD methods
  async createManufacturer(
    createManufacturerDto: CreateManufacturerDto,
  ): Promise<Manufacturer> {
    try {
      // Prepare manufacturer data - handle empty vehicleCategory string
      const manufacturerData: any = { ...createManufacturerDto };

      // If vehicleCategory is empty string or not provided, apply default
      if (
        !manufacturerData.vehicleCategory ||
        manufacturerData.vehicleCategory === ''
      ) {
        manufacturerData.vehicleCategory = 'passenger_car';
      }

      const manufacturer = new this.manufacturerModel(manufacturerData);
      const savedManufacturer = await manufacturer.save();

      // Invalidate caches after creation
      await this.invalidateManufacturerCaches();

      return savedManufacturer;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error - could be name+vehicleCategory compound index
        const keyPattern = error.keyPattern || {};
        if (keyPattern.name && keyPattern.vehicleCategory) {
          throw new BadRequestException(
            `Manufacturer with name '${error.keyValue.name}' and vehicle category '${error.keyValue.vehicleCategory}' already exists`,
          );
        }
        const field = Object.keys(keyPattern)[0];
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

    const query = this.manufacturerModel
      // show ALL non-deleted by default (inactive included)
      .find({ isDeleted: false });

    // Apply collation for case-insensitive sort on name (supported by new index)
    query.collation({ locale: 'en', strength: 2 });

    const data = await query
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
      // Prepare update data - ensure vehicleCategory is handled consistently
      const updateData: any = { ...updateManufacturerDto };

      // If vehicleCategory is being updated, ensure it's not empty
      // (but don't apply default on update - only on create)
      if (updateData.vehicleCategory === '') {
        delete updateData.vehicleCategory; // Don't update if empty string
      }

      const manufacturer = await this.manufacturerModel
        .findOneAndUpdate(
          { _id: this.oid(id), isDeleted: false },
          { $set: updateData },
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
        // Duplicate key error - could be name+vehicleCategory compound index
        const keyPattern = error.keyPattern || {};
        if (keyPattern.name && keyPattern.vehicleCategory) {
          throw new BadRequestException(
            `Manufacturer with name '${error.keyValue.name}' and vehicle category '${error.keyValue.vehicleCategory}' already exists`,
          );
        }
        const field = Object.keys(keyPattern)[0];
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
    const query: FilterQuery<ManufacturerDocument> = { isDeleted: false };

    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(searchTerm, 'i');
      query.$or = [
        { name: regex },
        { displayName: regex },
        { description: regex },
        { vehicleCategory: regex },
      ];
    }

    // IsActive filter
    if (filters.isActive !== undefined && filters.isActive !== null) {
      query.isActive = filters.isActive;
    }

    // Category filter
    if (filters.category) {
      const categoryFilter = this.getCategoryFilter(filters.category);
      Object.assign(query, categoryFilter);
    }

    // Sorting
    const { field: sortBy, dir: sortDir } = this.coerceSort(
      filters.sortBy,
      filters.sortOrder,
    );
    const sort: { [key: string]: SortOrder } = { [sortBy]: sortDir };

    // Pagination
    const limit = this.clamp(filters.limit || 10, 1, 100);
    const page = this.clamp(filters.page || 1, 1, 1000);
    const skip = (page - 1) * limit;

    // Cache check
    const cacheKey = this.key({
      type: 'filtered',
      query,
      sort,
      limit,
      page,
    });
    const cached =
      await this.redisService.cacheGet<PaginatedManufacturerResponseDto>(
        cacheKey,
      );
    if (cached) return cached;

    // Execute query
    const [total, data] = await Promise.all([
      this.manufacturerModel.countDocuments(query).exec(),
      (() => {
        const q = this.manufacturerModel.find(query);
        // Only apply collation if sorting by a string field where we want case-insensitivity
        // and ideally have an index. 'name' is now covered by { isDeleted: 1, name: 1 } with collation.
        // For date/number fields, avoid collation so standard indexes work efficiently.
        const stringSortFields = ['name', 'displayName', 'originCountry', 'headquarters', 'vehicleCategory'];
        if (stringSortFields.includes(sortBy)) {
          q.collation({ locale: 'en', strength: 2 });
        }
        return q.sort(sort)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec();
      })(),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const response: PaginatedManufacturerResponseDto = {
      data: data as any,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };

    // Cache result
    await this.redisService.cacheSet(
      cacheKey,
      response,
      ManufacturersService.CACHE_TTL.LIST_SHORT,
    );

    return response;
  }

  // Helper methods for filtering
  // Updated to use vehicleCategory field instead of hardcoded name mappings
  private getCategoryFilter(category: string): any {
    // Use the vehicleCategory field for filtering
    return {
      vehicleCategory: category,
    };
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
      return {
        totalRows: 0,
        uniqueRows: 0,
        insertedCount: 0,
        skippedCount: 0,
        inserted: [],
        skipped: [],
      };
    }

    const headerAliases: Record<string, string> = {
      'manufacturer name': 'name',
      'brand name': 'name',
      displayname: 'displayName',
      'display name': 'displayName',
      origincountry: 'originCountry',
      'origin country': 'originCountry',
      origin: 'originCountry',
      country: 'originCountry',
      foundedyear: 'foundedYear',
      'founded year': 'foundedYear',
      'year founded': 'foundedYear',
      headquarter: 'headquarters',
      headquarters: 'headquarters',
      'logo url': 'logo',
      'website url': 'website',
      isactive: 'isActive',
      'is active': 'isActive',
      active: 'isActive',
      ispremium: 'isPremium',
      'is premium': 'isPremium',
      premium: 'isPremium',
      isdeleted: 'isDeleted',
      'is deleted': 'isDeleted',
      deleted: 'isDeleted',
    };

    const normalizeKey = (rawKey: string) => {
      const trimmed = rawKey.trim();
      if (!trimmed) return trimmed;
      const keyNorm = trimmed.replace(/[\s_\-]+/g, ' ').toLowerCase();
      if (headerAliases[keyNorm]) return headerAliases[keyNorm];
      return trimmed;
    };

    const normalizeRowKeys = (row: Record<string, any>) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeKey(key), value]),
      );

    const normalizedRows = rows.map(normalizeRowKeys);

    const seen = new Set<string>();
    const uniqueRows: Record<string, any>[] = [];
    const skipped: Record<string, any>[] = [];

    normalizedRows.forEach((row) => {
      const baseName = row.name ?? row.displayName;
      if (!baseName || typeof baseName !== 'string') {
        skipped.push({ row, reason: 'Missing manufacturer name' });
        return;
      }
      const trimmedName = baseName.trim();
      if (!trimmedName) {
        skipped.push({ row, reason: 'Missing manufacturer name' });
        return;
      }
      const key = trimmedName.toLowerCase();
      if (seen.has(key)) {
        skipped.push({ row, reason: 'Duplicate in CSV' });
        return;
      }
      seen.add(key);
      uniqueRows.push({ ...row, name: trimmedName });
    });

    const existing = await this.manufacturerModel
      .find({ name: { $in: uniqueRows.map((r) => r.name) } })
      .select('name')
      .lean();

    const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));

    const finalRows = uniqueRows.filter((row) => {
      if (existingNames.has(String(row.name).toLowerCase())) {
        skipped.push({ row, reason: 'Already exists in database' });
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
        message: 'All manufacturers already exist in the database.',
      };
    }

    const parseBool = (val: any, defaultValue = false) =>
      this.parseBoolean(val, defaultValue);
    const parseNumber = (val: any) => {
      if (val === undefined || val === null || val === '') return undefined;
      const parsed = Number(val);
      return Number.isNaN(parsed) ? undefined : parsed;
    };
    const parseString = (val: any) =>
      typeof val === 'string' ? val.trim() : val;

    const docs = finalRows.map((row) => ({
      name: parseString(row.name),
      displayName: parseString(row.displayName) || parseString(row.name),
      originCountry: parseString(row.originCountry),
      description: parseString(row.description),
      logo: parseString(row.logo),
      website: parseString(row.website),
      foundedYear: parseNumber(row.foundedYear),
      headquarters: parseString(row.headquarters),
      isActive: parseBool(row.isActive, true),
      isPremium: parseBool(row.isPremium, false),
      isDeleted: parseBool(row.isDeleted, false),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    let insertedIds: Record<number, any> = {};
    let writeErrors: any[] = [];

    try {
      const result = await this.manufacturerModel.collection.insertMany(docs, {
        ordered: false,
        bypassDocumentValidation: true,
      });
      insertedIds = (result && (result as any).insertedIds) || {};
    } catch (err: any) {
      insertedIds =
        err?.result?.insertedIds ||
        err?.insertedIds ||
        err?.result?.result?.insertedIds ||
        {};
      writeErrors = err?.writeErrors || err?.result?.writeErrors || [];
      if (!Object.keys(insertedIds).length && writeErrors.length === 0) {
        throw err;
      }
    }

    const inserted = Object.entries(insertedIds).map(([index, _id]) => {
      const doc = docs[Number(index)];
      return {
        _id,
        name: doc?.name,
        displayName: doc?.displayName,
        originCountry: doc?.originCountry,
      };
    });

    const skippedFromErrors =
      writeErrors.length > 0
        ? writeErrors.map((we: any) => ({
          row: docs[we.index] ?? we.op,
          reason: we.errmsg || we.message || 'Insert failed',
        }))
        : [];

    skipped.push(...skippedFromErrors);

    const fallbackSkippedCount = Math.max(0, docs.length - inserted.length);
    const skippedCount =
      skipped.length > 0 ? skipped.length : fallbackSkippedCount;

    await this.invalidateManufacturerCaches();

    return {
      totalRows: rows.length,
      uniqueRows: uniqueRows.length,
      insertedCount: inserted.length,
      skippedCount,
      inserted,
      skipped,
    };
  }
}
