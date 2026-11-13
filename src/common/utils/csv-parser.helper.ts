import { BadRequestException } from '@nestjs/common';
import { parseJsonSafely, parseBoolean } from './validation.helpers';
import { VALID_FUEL_TYPES, VALID_TRANSMISSION_TYPES, VALID_FEATURE_PACKAGES, VALID_VEHICLE_TYPES } from '../constants/vehicle.constants';

/**
 * Parses CSV content into an array of objects
 * Optimized for better performance and error handling
 */
export function parseCSV(csvContent: string): Record<string, string>[] {
  if (!csvContent || !csvContent.trim()) {
    throw new BadRequestException('CSV content is empty');
  }

  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) {
    throw new BadRequestException('CSV file must have at least a header row and one data row');
  }

  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  if (headers.length === 0) {
    throw new BadRequestException('CSV header row is empty');
  }

  const rows: Record<string, string>[] = [];
  const headerCount = headers.length;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    // Skip completely empty rows
    if (values.length === 0 || values.every(v => !v.trim())) {
      continue;
    }

    // Validate column count
    if (values.length !== headerCount) {
      throw new BadRequestException(
        `Row ${i + 1} has ${values.length} columns but expected ${headerCount}. Headers: ${headers.join(', ')}`
      );
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new BadRequestException('CSV file has no valid data rows');
  }

  return rows;
}

/**
 * Parses a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current); // Add last value

  return values;
}

/**
 * Converts CSV row values to appropriate types based on field requirements
 */
export function convertCSVRowToDto(row: Record<string, string>, fieldTypes: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date'>): any {
  const dto: any = {};

  for (const [key, value] of Object.entries(row)) {
    if (!value || value.trim() === '') {
      continue; // Skip empty values
    }

    const fieldType = fieldTypes[key];
    if (!fieldType) {
      dto[key] = value; // Unknown field, keep as string
      continue;
    }

    try {
      switch (fieldType) {
        case 'number':
          dto[key] = parseFloat(value);
          if (isNaN(dto[key])) {
            throw new BadRequestException(`Invalid number value for field "${key}": ${value}`);
          }
          break;

        case 'boolean':
          dto[key] = parseBoolean(value);
          if (dto[key] === undefined) {
            throw new BadRequestException(`Invalid boolean value for field "${key}": ${value}. Must be "true" or "false"`);
          }
          break;

        case 'array':
          // Handle comma-separated arrays (e.g., "petrol,diesel" or quoted "petrol,diesel")
          const cleanValue = value.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
          const arrayValues = cleanValue.split(',').map(item => item.trim()).filter(item => item);
          
          // Validate enum values for specific fields
          if (key === 'fuelTypes') {
            const invalid = arrayValues.filter(v => !VALID_FUEL_TYPES.includes(v as any));
            if (invalid.length > 0) {
              throw new BadRequestException(`Invalid fuel type(s): ${invalid.join(', ')}. Valid values: ${VALID_FUEL_TYPES.join(', ')}`);
            }
          } else if (key === 'transmissionTypes') {
            const invalid = arrayValues.filter(v => !VALID_TRANSMISSION_TYPES.includes(v as any));
            if (invalid.length > 0) {
              throw new BadRequestException(`Invalid transmission type(s): ${invalid.join(', ')}. Valid values: ${VALID_TRANSMISSION_TYPES.join(', ')}`);
            }
          }
          
          dto[key] = arrayValues;
          break;

        case 'object':
          dto[key] = parseJsonSafely(value);
          if (dto[key] === undefined) {
            throw new BadRequestException(`Invalid JSON value for field "${key}": ${value}`);
          }
          break;

        case 'date':
          dto[key] = new Date(value);
          if (isNaN(dto[key].getTime())) {
            throw new BadRequestException(`Invalid date value for field "${key}": ${value}`);
          }
          break;

        case 'string':
        default:
          // Validate enum values for string fields
          if (key === 'vehicleType' && !VALID_VEHICLE_TYPES.includes(value as any)) {
            throw new BadRequestException(`Invalid vehicle type: ${value}. Valid values: ${VALID_VEHICLE_TYPES.join(', ')}`);
          } else if (key === 'fuelType' && !VALID_FUEL_TYPES.includes(value as any)) {
            throw new BadRequestException(`Invalid fuel type: ${value}. Valid values: ${VALID_FUEL_TYPES.join(', ')}`);
          } else if (key === 'transmissionType' && !VALID_TRANSMISSION_TYPES.includes(value as any)) {
            throw new BadRequestException(`Invalid transmission type: ${value}. Valid values: ${VALID_TRANSMISSION_TYPES.join(', ')}`);
          } else if (key === 'featurePackage' && !VALID_FEATURE_PACKAGES.includes(value as any)) {
            throw new BadRequestException(`Invalid feature package: ${value}. Valid values: ${VALID_FEATURE_PACKAGES.join(', ')}`);
          }
          dto[key] = value;
          break;
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error processing field "${key}": ${error.message}`);
    }
  }

  return dto;
}

