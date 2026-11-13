import { BadRequestException, ConflictException } from '@nestjs/common';

/**
 * Custom business exceptions for better error handling
 */

export class DuplicateEntityException extends ConflictException {
  constructor(entityType: string, identifier: string) {
    super(`${entityType} with ${identifier} already exists`);
  }
}

export class EntityNotFoundException extends BadRequestException {
  constructor(entityType: string, identifier: string) {
    super(`${entityType} with ${identifier} not found`);
  }
}

export class InvalidEnumValueException extends BadRequestException {
  constructor(field: string, validValues: string[]) {
    super(
      `Invalid ${field}. Must be one of: ${validValues.join(', ')}`,
    );
  }
}

