import {
  countTokens,
  normalizePhrase,
  normalizeToken,
  slugify,
  tokenize,
} from '../services/text-normalizer';

describe('text-normalizer', () => {
  describe('tokenize', () => {
    it('preserves the exact character span of every token', () => {
      const raw = 'Cars  in Kollam!';
      const tokens = tokenize(raw);
      expect(tokens.map((t) => t.text)).toEqual(['cars', 'in', 'kollam']);
      for (const t of tokens) {
        expect(raw.slice(t.start, t.end)).toBe(t.raw);
      }
    });

    it('keeps Indian digit grouping together and strips the separators', () => {
      expect(tokenize('5,00,000').map((t) => t.text)).toEqual(['500000']);
      expect(tokenize('1.5 lakh').map((t) => t.text)).toEqual(['1.5', 'lakh']);
    });

    it('does not split a glued number+unit', () => {
      expect(tokenize('2bhk 5lakh').map((t) => t.text)).toEqual(['2bhk', '5lakh']);
    });

    it('does not merge words across punctuation', () => {
      expect(tokenize('civic,vti').map((t) => t.text)).toEqual(['civic', 'vti']);
    });

    it('returns nothing for empty input', () => {
      expect(tokenize('')).toEqual([]);
      expect(tokenize('   ')).toEqual([]);
      expect(tokenize('!!!')).toEqual([]);
    });

    it('never produces a token containing whitespace', () => {
      for (const t of tokenize('a  b\tc\nd')) {
        expect(t.text).not.toMatch(/\s/);
      }
    });
  });

  describe('normalizeToken', () => {
    it('lowercases and normalizes unicode', () => {
      expect(normalizeToken('KOLLAM')).toBe('kollam');
      expect(normalizeToken('Ｃａｒ')).toBe('car');
    });

    it('transliterates the seeded Malayalam vocabulary', () => {
      expect(normalizeToken('കാർ')).toBe('car');
      expect(normalizeToken('ബൈക്ക്')).toBe('bike');
      expect(normalizeToken('കൊല്ലം')).toBe('kollam');
      expect(normalizeToken('വാടക')).toBe('rent');
    });

    it('leaves unmapped Malayalam untouched rather than mangling it', () => {
      const unmapped = 'മേശ'; // "table" — deliberately not in the table
      expect(normalizeToken(unmapped)).toBe(unmapped);
    });
  });

  describe('normalizePhrase / countTokens', () => {
    it('produces a phrase comparable to what tokenize yields at query time', () => {
      expect(normalizePhrase('  Second   Hand  Car ')).toBe('second hand car');
      expect(countTokens(normalizePhrase('Second Hand Car'))).toBe(3);
      expect(countTokens('')).toBe(0);
    });

    it('is idempotent', () => {
      const once = normalizePhrase('Maruti  Suzuki, Swift-Dzire');
      expect(normalizePhrase(once)).toBe(once);
    });
  });

  describe('slugify', () => {
    it('produces the slug shape written onto ad documents', () => {
      expect(slugify('Maruti Suzuki')).toBe('maruti-suzuki');
      expect(slugify('Kollam')).toBe('kollam');
      expect(slugify('  Royal   Enfield  ')).toBe('royal-enfield');
    });
  });
});
