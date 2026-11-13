/**
 * Validation helper utilities
 */

/**
 * Validates if a value is a valid boolean string (true/false lowercase)
 */
export function isValidBooleanString(value: string): boolean {
  return value === 'true' || value === 'false';
}

/**
 * Converts string boolean to actual boolean
 */
export function parseBoolean(value: string | boolean | undefined): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  return undefined;
}

/**
 * Validates if JSON string is valid JSON
 */
export function isValidJsonString(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses JSON string safely
 */
export function parseJsonSafely<T = any>(value: string | object | undefined): T | undefined {
  if (!value) return undefined;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Validates MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

