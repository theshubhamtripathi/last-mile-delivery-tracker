/**
 * Money is represented everywhere as an integer number of paise (1 rupee = 100
 * paise). Floats are never used for currency: a rounding error in the pricing
 * engine would silently mischarge every order. All arithmetic here stays in
 * integer space and rounds exactly once, at a named step.
 */

export type Paise = number;

/** Basis points: 1 bp = 0.01%. 1800 bp = 18% (GST). Config stores rates as bp. */
export type BasisPoints = number;

const PAISE_PER_RUPEE = 100;

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer paise value, got ${value}`);
  }
}

/** Convert whole/decimal rupees to paise. Used only at config/seed boundaries. */
export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * PAISE_PER_RUPEE);
}

export function paiseToRupees(paise: Paise): number {
  assertInteger(paise, 'paise');
  return paise / PAISE_PER_RUPEE;
}

/**
 * Apply a basis-point rate to a paise base, rounding to the nearest paise.
 * e.g. percentOf(20000, 1800) => 3600 (18% of ₹200.00 = ₹36.00).
 */
export function percentOf(basePaise: Paise, bp: BasisPoints): Paise {
  assertInteger(basePaise, 'basePaise');
  return Math.round((basePaise * bp) / 10000);
}

/** Clamp a paise amount into an optional [min, max] window. */
export function clampPaise(
  value: Paise,
  minPaise?: Paise | null,
  maxPaise?: Paise | null,
): Paise {
  let out = value;
  if (typeof minPaise === 'number') out = Math.max(out, minPaise);
  if (typeof maxPaise === 'number') out = Math.min(out, maxPaise);
  return out;
}

export function sumPaise(values: Paise[]): Paise {
  return values.reduce((acc, v) => {
    assertInteger(v, 'paise');
    return acc + v;
  }, 0);
}

/**
 * Format paise as an Indian-locale rupee string, e.g. 29618 => "₹296.18".
 * The single place currency becomes a display string, per the charter.
 */
export function formatINR(paise: Paise): string {
  assertInteger(paise, 'paise');
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / PAISE_PER_RUPEE);
}
