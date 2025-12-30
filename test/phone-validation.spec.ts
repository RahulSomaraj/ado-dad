import 'dotenv/config';
import {
  validatePhoneNumber,
  validatePhoneNumberWithPhoneCode,
  formatPhoneNumber,
  parsePhoneNumber,
  phoneCodeToIsoCode,
  isoCodeToPhoneCode,
  isValidPhoneCode,
  getSupportedPhoneCodes,
  getSupportedCountries,
} from '../src/common/utils/phone-validator.util';

describe('Phone Validation Utility', () => {
  describe('validatePhoneNumber', () => {
    it('should validate Indian phone numbers correctly', () => {
      const result = validatePhoneNumber('9876543210', 'IN');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid Indian phone numbers', () => {
      const result = validatePhoneNumber('1234567890', 'IN');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate US phone numbers correctly', () => {
      const result = validatePhoneNumber('5551234567', 'US');
      expect(result.valid).toBe(true);
    });

    it('should validate UAE phone numbers correctly', () => {
      const result = validatePhoneNumber('501234567', 'AE');
      expect(result.valid).toBe(true);
    });

    it('should reject phone numbers with wrong length', () => {
      const result = validatePhoneNumber('12345', 'IN');
      expect(result.valid).toBe(false);
    });

    it('should reject unsupported country codes', () => {
      const result = validatePhoneNumber('1234567890', 'XX');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
    });
  });

  describe('validatePhoneNumberWithPhoneCode', () => {
    it('should validate with phone code +91', () => {
      const result = validatePhoneNumberWithPhoneCode('9876543210', '+91');
      expect(result.valid).toBe(true);
    });

    it('should validate with phone code +971', () => {
      const result = validatePhoneNumberWithPhoneCode('501234567', '+971');
      expect(result.valid).toBe(true);
    });

    it('should validate with phone code +1', () => {
      const result = validatePhoneNumberWithPhoneCode('5551234567', '+1');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid phone code', () => {
      const result = validatePhoneNumberWithPhoneCode('9876543210', '+999');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid phone country code');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format Indian phone number', () => {
      const formatted = formatPhoneNumber('IN', '9876543210');
      expect(formatted).toBe('+919876543210');
    });

    it('should format US phone number', () => {
      const formatted = formatPhoneNumber('US', '5551234567');
      expect(formatted).toBe('+15551234567');
    });

    it('should format UAE phone number', () => {
      const formatted = formatPhoneNumber('AE', '501234567');
      expect(formatted).toBe('+971501234567');
    });
  });

  describe('parsePhoneNumber', () => {
    it('should parse full Indian phone number', () => {
      const parsed = parsePhoneNumber('+919876543210');
      expect(parsed).not.toBeNull();
      expect(parsed?.countryCode).toBe('IN');
      expect(parsed?.phoneNumber).toBe('9876543210');
    });

    it('should parse full US phone number', () => {
      const parsed = parsePhoneNumber('+15551234567');
      expect(parsed).not.toBeNull();
      expect(parsed?.countryCode).toBe('US');
      expect(parsed?.phoneNumber).toBe('5551234567');
    });

    it('should parse phone number without + prefix', () => {
      const parsed = parsePhoneNumber('919876543210');
      expect(parsed).not.toBeNull();
      expect(parsed?.countryCode).toBe('IN');
      expect(parsed?.phoneNumber).toBe('9876543210');
    });

    it('should parse 10-digit number as India by default', () => {
      const parsed = parsePhoneNumber('9876543210');
      expect(parsed).not.toBeNull();
      expect(parsed?.countryCode).toBe('IN');
      expect(parsed?.phoneNumber).toBe('9876543210');
    });

    it('should return null for invalid format', () => {
      const parsed = parsePhoneNumber('invalid');
      expect(parsed).toBeNull();
    });
  });

  describe('phoneCodeToIsoCode', () => {
    it('should convert +91 to IN', () => {
      const isoCode = phoneCodeToIsoCode('+91');
      expect(isoCode).toBe('IN');
    });

    it('should convert +1 to US', () => {
      const isoCode = phoneCodeToIsoCode('+1');
      expect(isoCode).toBe('US');
    });

    it('should convert +971 to AE', () => {
      const isoCode = phoneCodeToIsoCode('+971');
      expect(isoCode).toBe('AE');
    });

    it('should return null for invalid phone code', () => {
      const isoCode = phoneCodeToIsoCode('+999');
      expect(isoCode).toBeNull();
    });
  });

  describe('isoCodeToPhoneCode', () => {
    it('should convert IN to +91', () => {
      const phoneCode = isoCodeToPhoneCode('IN');
      expect(phoneCode).toBe('+91');
    });

    it('should convert US to +1', () => {
      const phoneCode = isoCodeToPhoneCode('US');
      expect(phoneCode).toBe('+1');
    });

    it('should convert AE to +971', () => {
      const phoneCode = isoCodeToPhoneCode('AE');
      expect(phoneCode).toBe('+971');
    });

    it('should return null for invalid ISO code', () => {
      const phoneCode = isoCodeToPhoneCode('XX');
      expect(phoneCode).toBeNull();
    });
  });

  describe('isValidPhoneCode', () => {
    it('should validate +91', () => {
      expect(isValidPhoneCode('+91')).toBe(true);
    });

    it('should validate +971', () => {
      expect(isValidPhoneCode('+971')).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(isValidPhoneCode('91')).toBe(false);
      expect(isValidPhoneCode('+999')).toBe(false);
      expect(isValidPhoneCode('invalid')).toBe(false);
    });
  });

  describe('getSupportedPhoneCodes', () => {
    it('should return array of phone codes', () => {
      const codes = getSupportedPhoneCodes();
      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBeGreaterThan(0);
      expect(codes).toContain('+91');
      expect(codes).toContain('+1');
      expect(codes).toContain('+971');
    });

    it('should have all codes starting with +', () => {
      const codes = getSupportedPhoneCodes();
      codes.forEach((code) => {
        expect(code).toMatch(/^\+\d+$/);
      });
    });
  });

  describe('getSupportedCountries', () => {
    it('should return array of countries', () => {
      const countries = getSupportedCountries();
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(0);
    });

    it('should include India', () => {
      const countries = getSupportedCountries();
      const india = countries.find((c) => c.code === 'IN');
      expect(india).toBeDefined();
      expect(india?.phoneCode).toBe('+91');
    });
  });
});

