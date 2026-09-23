import {
  FuzzyLexicon,
  editDistance,
  maxEditsFor,
  phoneticKey,
} from '../services/fuzzy-lexicon';

describe('FuzzyLexicon', () => {
  const vocab = [
    'creta', 'swift', 'hyundai', 'maruti', 'suzuki', 'wagonr', 'enfield', 'royal',
    'activa', 'access', 'verna', 'vento', 'venue', 'petrol', 'diesel', 'automatic',
    'kollam', 'kochi', 'thrissur', 'punalur', 'house', 'flat', 'cars', 'car',
  ];
  let fz: FuzzyLexicon;

  beforeEach(() => {
    fz = new FuzzyLexicon();
    fz.build(vocab);
  });

  describe('editDistance', () => {
    it.each([
      ['creta', 'creta', 0],
      ['cretta', 'creta', 1],
      ['swfit', 'swift', 1], // adjacent transposition counts as one edit
      ['hyndai', 'hyundai', 1],
      ['hundai', 'hyundai', 1],
      ['marutti', 'maruti', 1],
      ['abc', 'xyz', 3],
    ])('%s → %s = %d', (a, b, d) => {
      expect(editDistance(a, b, 3)).toBe(d);
    });

    it('short-circuits past the cap', () => {
      expect(editDistance('abcdefgh', 'zzzzzzzz', 2)).toBe(3);
    });
  });

  describe('maxEditsFor', () => {
    it.each([
      [3, 0],
      [4, 0],
      [5, 1],
      [7, 1],
      [8, 2],
      [12, 2],
    ])('length %d allows %d edit(s)', (len, edits) => {
      expect(maxEditsFor(len)).toBe(edits);
    });
  });

  describe('phoneticKey', () => {
    it.each([
      ['wagonr', 'vagonar'],
      ['enfield', 'enfeild'],
      ['hyundai', 'hyndai'],
      ['creta', 'cretta'],
    ])('%s and %s share a key', (a, b) => {
      expect(phoneticKey(a)).toBe(phoneticKey(b));
    });

    it('keeps activa and access apart', () => {
      expect(phoneticKey('activa')).not.toBe(phoneticKey('access'));
    });
  });

  describe('correct', () => {
    it.each([
      ['cretta', 'creta', 'edit'],
      ['swfit', 'swift', 'edit'],
      ['hyndai', 'hyundai', 'edit'],
      ['hundai', 'hyundai', 'edit'],
      ['enfeild', 'enfield', 'edit'],
      ['petrl', 'petrol', 'edit'],
      ['kolam', 'kollam', 'edit'],
      ['vagonar', 'wagonr', 'phonetic'],
    ])('corrects %s → %s via %s', (from, to, via) => {
      const hit = fz.correct(from);
      expect(hit?.to).toBe(to);
      expect(hit?.via).toBe(via);
    });

    it('returns null for a word already in the vocabulary', () => {
      expect(fz.correct('creta')).toBeNull();
      expect(fz.has('creta')).toBe(true);
    });

    it('never corrects short tokens', () => {
      expect(fz.correct('crat')).toBeNull(); // 4 chars: could be car/cars/creta — too risky
      expect(fz.correct('kia')).toBeNull();
    });

    it('never corrects numbers', () => {
      expect(fz.correct('20200')).toBeNull();
    });

    it('scales the edit budget with length', () => {
      // 5 chars: one edit only. "venua" is 1 from "venue" → ok.
      expect(fz.correct('venua')?.to).toBe('venue');
      // "hyunday" is 7 chars, 1 edit from hyundai → ok; "hyundayi" (8) allows 2.
      expect(fz.correct('hyunday')?.to).toBe('hyundai');
      expect(fz.correct('hyundayi')?.to).toBe('hyundai');
    });

    it('does not apply a tie between two candidates at the same distance', () => {
      // 'venuo' is one edit from both 'vento' and 'venue'.
      expect(fz.correct('venuo')).toBeNull();
      // ...and 'verno' is one edit from 'verna' only (vento is two away), so it applies.
      expect(fz.correct('verno')?.to).toBe('verna');
    });

    it('does not turn activa into access or vice versa', () => {
      expect(fz.correct('activ')?.to).toBe('activa');
      expect(fz.correct('acces')?.to).toBe('access');
      expect(fz.correct('activs')?.to).toBe('activa');
    });

    it('ignores unknown words far from everything', () => {
      expect(fz.correct('sofaset')).toBeNull();
      expect(fz.correct('family')).toBeNull();
    });
  });
});
