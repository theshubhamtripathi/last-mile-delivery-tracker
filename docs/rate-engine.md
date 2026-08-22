# Rate calculation engine

Source: [`packages/shared/src/pricing`](../packages/shared/src/pricing). Pure,
framework-free, 45 table-driven tests, 100% branch coverage on `compute.ts`.

## Algorithm (exact order)

1. **Scope** — `pickupZone === dropZone ? INTRA_ZONE : INTER_ZONE`.
2. **Volumetric weight** — `ceil(L × B × H × 1000 ÷ divisor)` grams. The divisor
   is configuration (default 5000); the literal appears only in a seed row and
   here.
3. **Chargeable weight** — `max(actual, volumetric)`, record the winning basis,
   round **up** to `weightRoundingStepGrams`, then apply
   `minChargeableWeightGrams`. This is the only rounding of weight, so step 5 is
   linear.
4. **Rate card** — filter by `(orderType, scope, effectiveFrom ≤ asOf <
   effectiveTo)`; prefer an exact origin→destination zone pair over a
   scope-level default. **Zero matches is a hard error** (`RATE_CARD_NOT_FOUND`),
   never a silent zero.
5. **Slab freight** — `flat + (chargeable − slab.from)/1000 × perKg`. Slabs are
   `[from, to)` (upper bound exclusive), so boundaries never overlap; the top
   slab is open-ended.
6. **Surcharges** — fuel on freight only; COD (when `paymentType = COD`) as
   flat / percent-of-freight / greater-of, with min–max clamps.
7. **Tax** — applied last to `freight + fuel + surcharges`; integer paise
   throughout; one rounding at the end.

The result includes an `explain[]` array of plain-language lines, rendered
verbatim in the waybill panel.

## Worked example (matches the README and the live app to the paisa)

> Parcel 30 × 20 × 15 cm, actual 1.2 kg, **B2C**, **inter-zone** (Bhopal → Pune),
> **COD** on a ₹1,500 declared value.

| Step | Value |
|---|---|
| Volume | 30 × 20 × 15 = 9,000 cm³ |
| Volumetric | 9,000 × 1000 ÷ 5000 = **1,800 g** |
| Chargeable | max(1200, 1800) = 1800 → round up to 0.5 kg step = **2,000 g** (basis: volumetric) |
| Slab (0.5–5 kg) | ₹80 base + (2000 − 500)/1000 × ₹80/kg = ₹80 + ₹120 = **₹200.00** |
| Fuel 8% | ₹16.00 |
| COD | greater of ₹35 flat and 2% of freight → **₹35.00** |
| Subtotal | 200 + 16 + 35 = **₹251.00** |
| GST 18% | ₹45.18 |
| **Total** | **₹296.18** |

Frozen onto the order as `pricingSnapshot`; later rate-card edits do not alter
it. Reproduce it live at **Admin → Rate simulator** (Bhopal → Pune) or via
`POST /quotes`.

## Test coverage

`packages/shared/src/pricing/__tests__` covers: actual/volumetric/tie basis;
slab lower and upper boundaries and the open top slab; intra vs inter; B2B vs
B2C; COD flat/percent/greater-of and both clamps; prepaid; expired and missing
cards; specificity (exact pair vs default); rounding-step edges; min-weight;
zero/negative/absurd inputs; and config validation. Run:

```bash
npm run test --workspace @lmd/shared
```
