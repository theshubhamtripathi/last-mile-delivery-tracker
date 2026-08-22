import {
  clampPaise,
  formatINR,
  percentOf,
  rupeesToPaise,
  sumPaise,
} from '../money';

describe('money', () => {
  it('converts rupees to integer paise', () => {
    expect(rupeesToPaise(296.18)).toBe(29618);
    expect(rupeesToPaise(80)).toBe(8000);
  });

  it('applies basis-point rates rounded to nearest paise', () => {
    expect(percentOf(20000, 1800)).toBe(3600); // 18% of ₹200.00
    expect(percentOf(150000, 200)).toBe(3000); // 2% of ₹1500.00
  });

  it('clamps into an optional window', () => {
    expect(clampPaise(3000, 3500, null)).toBe(3500); // COD floor
    expect(clampPaise(9000, null, 5000)).toBe(5000); // COD ceiling
    expect(clampPaise(4000, 3500, 5000)).toBe(4000);
  });

  it('sums and rejects non-integer paise', () => {
    expect(sumPaise([100, 200, 300])).toBe(600);
    expect(() => sumPaise([100.5])).toThrow();
  });

  it('formats paise as an INR string', () => {
    expect(formatINR(29618)).toBe('₹296.18');
  });
});
