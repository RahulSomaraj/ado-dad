/**
 * Phone Number Validation Utility
 * Uses google-libphonenumber for robust country-based phone number validation
 */

import {
  PhoneNumberUtil,
  PhoneNumberFormat,
  PhoneNumberType,
  CountryCode,
} from 'google-libphonenumber';

const phoneUtil = PhoneNumberUtil.getInstance();

/**
 * Validate phone number based on country code
 * @param phoneNumber - Phone number (without country code prefix)
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'IN', 'US')
 * @returns Validation result with error message if invalid
 */
export function validatePhoneNumber(
  phoneNumber: string,
  countryCode: string,
): { valid: boolean; error?: string } {
  try {
    // Convert country code to uppercase
    const upperCountryCode = countryCode.toUpperCase();

    // Check if country code is valid
    if (!phoneUtil.getSupportedRegions().includes(upperCountryCode)) {
      return {
        valid: false,
        error: `Country code '${countryCode}' is not supported`,
      };
    }

    // Parse the phone number
    const parsedNumber = phoneUtil.parse(
      phoneNumber,
      upperCountryCode as CountryCode,
    );

    // Validate the number
    const isValid = phoneUtil.isValidNumber(parsedNumber);
    const isValidForRegion = phoneUtil.isValidNumberForRegion(
      parsedNumber,
      upperCountryCode as CountryCode,
    );

    if (!isValid || !isValidForRegion) {
      const numberType = phoneUtil.getNumberType(parsedNumber);

      // Get example number for the country
      const exampleNumber = phoneUtil.getExampleNumber(
        upperCountryCode as CountryCode,
      );
      const exampleFormatted = exampleNumber
        ? phoneUtil.format(exampleNumber, PhoneNumberFormat.NATIONAL)
        : 'N/A';

      return {
        valid: false,
        error: `Invalid phone number for ${upperCountryCode}. Example format: ${exampleFormatted}`,
      };
    }

    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Invalid phone number format',
    };
  }
}

/**
 * Format phone number with country code
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param phoneNumber - Phone number (without country code prefix)
 * @returns Formatted phone number with country code (e.g., +919876543210)
 */
export function formatPhoneNumber(
  countryCode: string,
  phoneNumber: string,
): string {
  try {
    const upperCountryCode = countryCode.toUpperCase();
    const parsedNumber = phoneUtil.parse(
      phoneNumber,
      upperCountryCode as CountryCode,
    );
    return phoneUtil.format(parsedNumber, PhoneNumberFormat.E164);
  } catch (error) {
    // Fallback: just concatenate if parsing fails
    const countryCallingCode = phoneUtil.getCountryCodeForRegion(
      countryCode.toUpperCase() as CountryCode,
    );
    if (countryCallingCode) {
      return `+${countryCallingCode}${phoneNumber}`;
    }
    return `${countryCode}${phoneNumber}`;
  }
}

/**
 * Parse phone number from full format (e.g., +919876543210 or 919876543210)
 * Returns { countryCode, phoneNumber }
 * @param fullNumber - Full phone number with or without + prefix
 * @returns Parsed result with country code and phone number, or null if parsing fails
 */
export function parsePhoneNumber(fullNumber: string): {
  countryCode: string;
  phoneNumber: string;
} | null {
  try {
    // Remove any spaces, dashes, or parentheses
    const cleaned = fullNumber.replace(/[\s\-\(\)]/g, '');

    // Try to parse as international number
    const parsedNumber = phoneUtil.parse(cleaned, 'ZZ'); // 'ZZ' means unknown region

    if (!phoneUtil.isValidNumber(parsedNumber)) {
      // If parsing as international fails, try to extract country code manually
      // Default: assume India (+91) if starts with +91 or just 10 digits
      if (cleaned.startsWith('+91') || cleaned.startsWith('91')) {
        const phoneNumber = cleaned.replace(/^\+?91/, '');
        if (phoneNumber.length === 10) {
          return { countryCode: 'IN', phoneNumber };
        }
      }

      // If it's just digits and 10 long, assume India
      const digits = cleaned.replace(/\D/g, '');
      if (
        digits.length === 10 &&
        (digits.startsWith('6') ||
          digits.startsWith('7') ||
          digits.startsWith('8') ||
          digits.startsWith('9'))
      ) {
        return { countryCode: 'IN', phoneNumber: digits };
      }

      return null;
    }

    // Get country code from parsed number
    const regionCode = phoneUtil.getRegionCodeForNumber(parsedNumber);
    if (!regionCode) {
      return null;
    }

    // Get national number (without country code)
    const nationalNumber = parsedNumber.getNationalNumber()?.toString() || '';

    return {
      countryCode: regionCode,
      phoneNumber: nationalNumber,
    };
  } catch (error) {
    // Fallback: try to extract India number
    const cleaned = fullNumber.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('+91') || cleaned.startsWith('91')) {
      const phoneNumber = cleaned.replace(/^\+?91/, '');
      if (phoneNumber.length === 10) {
        return { countryCode: 'IN', phoneNumber };
      }
    }

    // If it's just digits and 10 long, assume India
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length === 10) {
      return { countryCode: 'IN', phoneNumber: digits };
    }

    return null;
  }
}

/**
 * Get list of supported countries
 * @returns Array of supported countries with code, name, phone code, and example
 */
export function getSupportedCountries(): Array<{
  code: string;
  name: string;
  phoneCode: string;
  example: string;
}> {
  const supportedRegions = phoneUtil.getSupportedRegions();
  const countries: Array<{
    code: string;
    name: string;
    phoneCode: string;
    example: string;
  }> = [];

  for (const regionCode of supportedRegions) {
    try {
      const countryCode = phoneUtil.getCountryCodeForRegion(
        regionCode as CountryCode,
      );
      const exampleNumber = phoneUtil.getExampleNumber(
        regionCode as CountryCode,
      );

      if (countryCode && exampleNumber) {
        const exampleFormatted = phoneUtil.format(
          exampleNumber,
          PhoneNumberFormat.NATIONAL,
        );

        countries.push({
          code: regionCode,
          name: getCountryName(regionCode),
          phoneCode: `+${countryCode}`,
          example: exampleFormatted.replace(/\D/g, ''), // Remove formatting for example
        });
      }
    } catch (error) {
      // Skip countries that can't be processed
      continue;
    }
  }

  // Sort by country code
  return countries.sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Convert phone country code (e.g., '+91') to ISO country code (e.g., 'IN')
 * @param phoneCode - Phone country code with + prefix (e.g., '+91', '+971')
 * @returns ISO 3166-1 alpha-2 country code or null if not found
 */
export function phoneCodeToIsoCode(phoneCode: string): string | null {
  try {
    // Remove + if present
    const code = phoneCode.replace(/^\+/, '');
    const numericCode = parseInt(code, 10);

    // Priority list for shared country codes (e.g., +1 is shared by US, CA, etc.)
    const priorityCountries: Record<number, string[]> = {
      1: ['US', 'CA'], // Prefer US or Canada for +1
    };

    // Check priority list first
    if (priorityCountries[numericCode]) {
      const supportedRegions = phoneUtil.getSupportedRegions();
      for (const priorityCode of priorityCountries[numericCode]) {
        if (supportedRegions.includes(priorityCode)) {
          const countryCallingCode = phoneUtil.getCountryCodeForRegion(
            priorityCode as CountryCode,
          );
          if (countryCallingCode === numericCode) {
            return priorityCode;
          }
        }
      }
    }

    // Find region by country calling code (fallback to first match)
    const supportedRegions = phoneUtil.getSupportedRegions();
    for (const regionCode of supportedRegions) {
      const countryCallingCode = phoneUtil.getCountryCodeForRegion(
        regionCode as CountryCode,
      );
      if (countryCallingCode === numericCode) {
        return regionCode;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert ISO country code (e.g., 'IN') to phone country code (e.g., '+91')
 * @param isoCode - ISO 3166-1 alpha-2 country code
 * @returns Phone country code with + prefix or null if not found
 */
export function isoCodeToPhoneCode(isoCode: string): string | null {
  try {
    const upperIsoCode = isoCode.toUpperCase();
    const countryCallingCode = phoneUtil.getCountryCodeForRegion(
      upperIsoCode as CountryCode,
    );
    return countryCallingCode ? `+${countryCallingCode}` : null;
  } catch (error) {
    return null;
  }
}

/**
 * Validate phone country code format (e.g., '+91', '+971')
 * @param phoneCode - Phone country code to validate
 * @returns true if valid format
 */
export function isValidPhoneCode(phoneCode: string): boolean {
  return (
    /^\+\d{1,4}$/.test(phoneCode) && phoneCodeToIsoCode(phoneCode) !== null
  );
}

/**
 * Get list of supported phone country codes
 * @returns Array of phone country codes (e.g., ['+91', '+1', '+971'])
 */
export function getSupportedPhoneCodes(): string[] {
  const supportedRegions = phoneUtil.getSupportedRegions();
  const phoneCodes: string[] = [];

  for (const regionCode of supportedRegions) {
    const phoneCode = isoCodeToPhoneCode(regionCode);
    if (phoneCode) {
      phoneCodes.push(phoneCode);
    }
  }

  return phoneCodes.sort();
}

/**
 * Validate phone number using phone country code (e.g., '+91')
 * @param phoneNumber - Phone number (without country code prefix)
 * @param phoneCode - Phone country code with + prefix (e.g., '+91', '+971')
 * @returns Validation result with error message if invalid
 */
export function validatePhoneNumberWithPhoneCode(
  phoneNumber: string,
  phoneCode: string,
): { valid: boolean; error?: string } {
  const isoCode = phoneCodeToIsoCode(phoneCode);
  if (!isoCode) {
    return {
      valid: false,
      error: `Invalid phone country code '${phoneCode}'`,
    };
  }
  return validatePhoneNumber(phoneNumber, isoCode);
}

/**
 * Get country name from ISO code
 * Simple mapping for common countries
 */
function getCountryName(isoCode: string): string {
  const countryNames: Record<string, string> = {
    IN: 'India',
    US: 'United States',
    GB: 'United Kingdom',
    AE: 'United Arab Emirates',
    SA: 'Saudi Arabia',
    PK: 'Pakistan',
    BD: 'Bangladesh',
    LK: 'Sri Lanka',
    CA: 'Canada',
    AU: 'Australia',
    DE: 'Germany',
    FR: 'France',
    IT: 'Italy',
    ES: 'Spain',
    BR: 'Brazil',
    MX: 'Mexico',
    JP: 'Japan',
    CN: 'China',
    KR: 'South Korea',
    SG: 'Singapore',
    MY: 'Malaysia',
    TH: 'Thailand',
    ID: 'Indonesia',
    PH: 'Philippines',
    VN: 'Vietnam',
    NZ: 'New Zealand',
    ZA: 'South Africa',
    EG: 'Egypt',
    NG: 'Nigeria',
    KE: 'Kenya',
  };

  return countryNames[isoCode] || isoCode;
}

/**
 * Get country phone configuration (for backward compatibility)
 * @deprecated Use validatePhoneNumber instead
 */
export interface CountryPhoneConfig {
  code: string;
  name: string;
  minLength: number;
  maxLength: number;
  pattern: RegExp;
  example: string;
}

/**
 * Get country phone configuration (for backward compatibility)
 * @deprecated Use getSupportedCountries instead
 */
export function getCountryConfig(
  countryCode: string,
): CountryPhoneConfig | undefined {
  try {
    const upperCountryCode = countryCode.toUpperCase();
    const countryCallingCode = phoneUtil.getCountryCodeForRegion(
      upperCountryCode as CountryCode,
    );
    const exampleNumber = phoneUtil.getExampleNumber(
      upperCountryCode as CountryCode,
    );

    if (!countryCallingCode || !exampleNumber) {
      return undefined;
    }

    const exampleFormatted = phoneUtil.format(
      exampleNumber,
      PhoneNumberFormat.NATIONAL,
    );
    const exampleDigits = exampleFormatted.replace(/\D/g, '');

    return {
      code: `+${countryCallingCode}`,
      name: getCountryName(upperCountryCode),
      minLength: exampleDigits.length - 2, // Approximate
      maxLength: exampleDigits.length + 2, // Approximate
      pattern: /^\d+$/, // Generic pattern
      example: exampleDigits,
    };
  } catch (error) {
    return undefined;
  }
}
