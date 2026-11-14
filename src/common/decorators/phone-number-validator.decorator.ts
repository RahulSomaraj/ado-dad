import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import {
  validatePhoneNumber,
  validatePhoneNumberWithPhoneCode,
  phoneCodeToIsoCode,
} from '../utils/phone-validator.util';

/**
 * Custom validator decorator for phone numbers with country code
 * Automatically uses the countryCode field from the same object
 * Supports both phone codes (e.g., '+91') and ISO codes (e.g., 'IN')
 *
 * @param defaultCountryCode - Default phone country code if countryCode field is not present (e.g., '+91')
 * @param validationOptions - Standard validation options
 *
 * @example
 * ```typescript
 * class CreateUserDto {
 *   @IsString()
 *   countryCode: string; // e.g., '+91'
 *
 *   @IsPhoneNumberWithCountry('+91')
 *   phoneNumber: string;
 * }
 * ```
 */
export function IsPhoneNumberWithCountry(
  defaultCountryCode: string = '+91',
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneNumberWithCountry',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [defaultCountryCode],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          // Get countryCode from the same object
          const obj = args.object as any;
          const countryCode = obj.countryCode || args.constraints[0];

          if (!countryCode) {
            return false;
          }

          // Check if it's a phone code (starts with +) or ISO code
          if (countryCode.startsWith('+')) {
            // It's a phone code (e.g., '+91')
            const result = validatePhoneNumberWithPhoneCode(value, countryCode);
            return result.valid;
          } else {
            // It's an ISO code (e.g., 'IN') - for backward compatibility
            const result = validatePhoneNumber(value, countryCode);
            return result.valid;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as any;
          const countryCode = obj.countryCode || args.constraints[0];
          
          if (countryCode.startsWith('+')) {
            const result = validatePhoneNumberWithPhoneCode(args.value, countryCode);
            return result.error || `Invalid phone number for country code ${countryCode}`;
          } else {
            const result = validatePhoneNumber(args.value, countryCode);
            return result.error || `Invalid phone number for country ${countryCode}`;
          }
        },
      },
    });
  };
}
