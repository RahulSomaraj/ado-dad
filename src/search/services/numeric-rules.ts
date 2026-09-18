import { RawToken } from './text-normalizer';

/**
 * Numeric intent extraction: budgets, BHK counts and model years.
 *
 * Runs AFTER the lexicon scan, over the tokens the lexicon did not claim. Indian
 * money words carry most of the value here — "under 5 lakh" is far more common
 * in these queries than "under 500000".
 */

export const MONEY_MULTIPLIERS: Readonly<Record<string, number>> = {
  k: 1_000,
  thousand: 1_000,
  thousands: 1_000,
  l: 100_000,
  lakh: 100_000,
  lakhs: 100_000,
  lac: 100_000,
  lacs: 100_000,
  lakshom: 100_000,
  cr: 10_000_000,
  crore: 10_000_000,
  crores: 10_000_000,
};

const MAX_COMPARATORS = new Set([
  'under', 'below', 'less', 'upto', 'max', 'maximum', 'within', 'budget',
]);
const MIN_COMPARATORS = new Set([
  'above', 'over', 'more', 'from', 'min', 'minimum', 'starting', 'atleast',
]);

/**
 * A bare amount with a unit and no comparator ("5 lakh car") is read as a
 * budget ceiling. That matches how people state a budget the overwhelming
 * majority of the time, and the resulting chip is removable — but it IS an
 * inference, so it is flagged and costs confidence. Flip this to disable.
 */
export const TREAT_BARE_AMOUNT_AS_BUDGET = true;

const MIN_PLAUSIBLE_YEAR = 1980;

export interface NumericFinding {
  field: 'minPrice' | 'maxPrice' | 'minYear' | 'maxYear' | 'bedrooms';
  value: number;
  /** Indices into the token array that this finding consumed. */
  consumed: number[];
  label: string;
  inferred?: boolean;
}

/** Parse a token like "5", "5.5", "500000" into a number, else null. */
function numeric(token: string | undefined): number | null {
  if (!token) return null;
  if (!/^\d+(\.\d+)?$/.test(token)) return null;
  const n = Number(token);
  return Number.isFinite(n) ? n : null;
}

/** "5lakh" / "500k" / "2bhk" written without a space. */
function splitGlued(token: string): { num: number; unit: string } | null {
  const m = /^(\d+(?:\.\d+)?)([a-z]+)$/.exec(token);
  if (!m) return null;
  const num = Number(m[1]);
  if (!Number.isFinite(num)) return null;
  return { num, unit: m[2] };
}

function formatMoney(value: number): string {
  if (value >= 10_000_000) return `₹${+(value / 10_000_000).toFixed(2)}Cr`;
  if (value >= 100_000) return `₹${+(value / 100_000).toFixed(2)}L`;
  if (value >= 1_000) return `₹${+(value / 1_000).toFixed(0)}K`;
  return `₹${value}`;
}

/**
 * Scan the unconsumed tokens for numeric intents.
 *
 * @param tokens   full token list (offsets preserved)
 * @param consumed parallel flags — true where the lexicon already claimed a token
 */
export function extractNumerics(
  tokens: RawToken[],
  consumed: boolean[],
  now: Date = new Date(),
): NumericFinding[] {
  const findings: NumericFinding[] = [];
  const maxYear = now.getFullYear() + 1;
  const free = (i: number) => i >= 0 && i < tokens.length && !consumed[i];
  const text = (i: number) => (free(i) ? tokens[i].text : undefined);

  const claim = (f: NumericFinding) => {
    findings.push(f);
    for (const i of f.consumed) consumed[i] = true;
  };

  for (let i = 0; i < tokens.length; i++) {
    if (!free(i)) continue;
    const t = tokens[i].text;

    // ---- BHK: "2bhk" or "2 bhk" / "3 bedroom" ----
    const glued = splitGlued(t);
    if (glued && /^(bhk|bed|beds|bedroom|bedrooms)$/.test(glued.unit)) {
      claim({ field: 'bedrooms', value: glued.num, consumed: [i], label: `${glued.num} BHK` });
      continue;
    }
    const n = numeric(t);
    if (n !== null && /^(bhk|bed|beds|bedroom|bedrooms)$/.test(text(i + 1) ?? '')) {
      claim({ field: 'bedrooms', value: n, consumed: [i, i + 1], label: `${n} BHK` });
      continue;
    }

    // ---- Year: "2018 model", "after 2018", bare 4-digit year ----
    if (n !== null && Number.isInteger(n) && n >= MIN_PLAUSIBLE_YEAR && n <= maxYear) {
      const prev = text(i - 1);
      const next = text(i + 1);
      if (prev && MIN_COMPARATORS.has(prev)) {
        claim({ field: 'minYear', value: n, consumed: [i - 1, i], label: `${n} & newer` });
        continue;
      }
      if (prev && MAX_COMPARATORS.has(prev)) {
        claim({ field: 'maxYear', value: n, consumed: [i - 1, i], label: `up to ${n}` });
        continue;
      }
      if (next === 'model' || next === 'onwards') {
        claim({ field: 'minYear', value: n, consumed: [i, i + 1], label: `${n} & newer` });
        continue;
      }
      // Bare year: treat as "that year or newer" rather than an exact match —
      // an exact-year filter almost always returns too little.
      claim({ field: 'minYear', value: n, consumed: [i], label: `${n} & newer`, inferred: true });
      continue;
    }

    // ---- Money ----
    // Forms: "<cmp> <num> <unit>", "<cmp> <num>", "<num> <unit>", "<num><unit>"
    let amount: number | null = null;
    let used: number[] = [];
    let cmp: 'min' | 'max' | null = null;

    const prev1 = text(i - 1);
    const prev2 = text(i - 2);
    // "less than", "more than", "up to" are two-word comparators.
    if (prev1 && (MAX_COMPARATORS.has(prev1) || MIN_COMPARATORS.has(prev1))) {
      cmp = MAX_COMPARATORS.has(prev1) ? 'max' : 'min';
      used.push(i - 1);
      if (prev2 && (prev2 === 'less' || prev2 === 'more' || prev2 === 'up')) {
        // handled below by the single-token comparator already pushed
      }
    } else if (
      (prev1 === 'than' && prev2 && (MAX_COMPARATORS.has(prev2) || MIN_COMPARATORS.has(prev2))) ||
      (prev1 === 'to' && prev2 === 'up')
    ) {
      cmp = prev2 === 'up' || MAX_COMPARATORS.has(prev2!) ? 'max' : 'min';
      used.push(i - 2, i - 1);
    }

    if (glued && MONEY_MULTIPLIERS[glued.unit] !== undefined) {
      amount = glued.num * MONEY_MULTIPLIERS[glued.unit];
      used.push(i);
    } else if (n !== null) {
      const unit = text(i + 1);
      if (unit && MONEY_MULTIPLIERS[unit] !== undefined) {
        amount = n * MONEY_MULTIPLIERS[unit];
        used.push(i, i + 1);
      } else if (n >= 1000) {
        // A bare number that big is rupees; smaller bare numbers are too
        // ambiguous (door numbers, counts) to read as money.
        amount = n;
        used.push(i);
      }
    }

    if (amount === null) continue;

    if (cmp === 'max') {
      claim({ field: 'maxPrice', value: amount, consumed: used, label: `under ${formatMoney(amount)}` });
    } else if (cmp === 'min') {
      claim({ field: 'minPrice', value: amount, consumed: used, label: `above ${formatMoney(amount)}` });
    } else if (TREAT_BARE_AMOUNT_AS_BUDGET) {
      claim({
        field: 'maxPrice',
        value: amount,
        consumed: used,
        label: `under ${formatMoney(amount)}`,
        inferred: true,
      });
    }
  }

  return findings;
}

export { formatMoney };
