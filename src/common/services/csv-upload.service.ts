import { Injectable, BadRequestException } from '@nestjs/common';
import { parseCSV, convertCSVRowToDto } from '../utils/csv-parser.helper';
import { isValidObjectId } from '../utils/validation.helpers';

export interface CSVUploadResult {
  total: number;
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export interface CSVUploadOptions<T> {
  file: Express.Multer.File;
  fieldTypes: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date'>;
  skipDuplicates?: boolean;
  validateRow: (dto: T, rowIndex: number) => string | null; // Returns error message or null
  createOrSkip: (dto: T) => Promise<any | null>;
  create: (dto: T) => Promise<any>;
}

@Injectable()
export class CsvUploadService {
  /**
   * Validates and processes CSV file upload
   */
  validateCSVFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV file');
    }
  }

  /**
   * Generic CSV upload processor
   */
  async processCSVUpload<T>(options: CSVUploadOptions<T>): Promise<CSVUploadResult> {
    const { file, fieldTypes, skipDuplicates = true, validateRow, createOrSkip, create } = options;

    this.validateCSVFile(file);

    const csvContent = file.buffer.toString('utf-8');
    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      throw new BadRequestException('CSV file is empty or has no data rows');
    }

    const results: CSVUploadResult = {
      total: rows.length,
      created: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      try {
        const dto = convertCSVRowToDto(rows[i], fieldTypes) as T;

        // Validate row using custom validator
        const validationError = validateRow(dto, i);
        if (validationError) {
          results.errors.push({ row: i + 2, error: validationError });
          continue;
        }

        // Process based on skipDuplicates flag
        if (skipDuplicates) {
          const result = await createOrSkip(dto);
          if (result) {
            results.created++;
          } else {
            results.skipped++;
          }
        } else {
          await create(dto);
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          row: i + 2,
          error: error.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Validates ObjectId field
   */
  validateObjectId(fieldName: string, value: string | undefined): string | null {
    if (!value) {
      return `${fieldName} is required`;
    }
    if (!isValidObjectId(value)) {
      return `Invalid ${fieldName} format: ${value}`;
    }
    return null;
  }

  /**
   * Validates required field
   */
  validateRequired(fieldName: string, value: any): string | null {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  }
}

