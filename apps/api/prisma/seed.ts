/**
 * Idempotent seed. Re-running never duplicates rows: singletons use fixed ids,
 * natural-key rows upsert on their unique column. Produces a system that looks
 * alive on first load — 8 zones, ~60 real pincodes, the four rate cards plus a
 * deliberately lapsed one (proving effective dating), COD rules for both order
 * types, customers and agents across zones. Orders are layered on in a separate
 * step. Demo credentials are printed at the end and mirrored in the README.
 *
 * Rate values are calibrated so the README worked example (Bhopal→Pune, B2C,
 * COD, 30×20×15 cm, 1.2 kg) prices to exactly ₹296.18.
 */
import { PrismaClient, type OrderType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Demo@1234';

// ── Zones ──────────────────────────────────────────────────────────────────
const ZONES = [
  { code: 'DL-NCR', name: 'Delhi NCR' },
  { code: 'MH-MUM', name: 'Mumbai' },
  { code: 'MH-PUN', name: 'Pune' },
  { code: 'KA-BLR', name: 'Bengaluru' },
  { code: 'TG-HYD', name: 'Hyderabad' },
  { code: 'TN-CHE', name: 'Chennai' },
  { code: 'WB-KOL', name: 'Kolkata' },
  { code: 'MP-BHO', name: 'Bhopal' },
];

// ~60 service areas across the zones (pincode, name, city, state, zone, lat, lng).
const AREAS: [string, string, string, string, string, number, number][] = [
  // Delhi NCR
  ['110001', 'Connaught Place', 'New Delhi', 'DL', 'DL-NCR', 28.6304, 77.2177],
  ['110002', 'Darya Ganj', 'New Delhi', 'DL', 'DL-NCR', 28.6438, 77.2412],
  ['110020', 'Okhla', 'New Delhi', 'DL', 'DL-NCR', 28.5355, 77.2730],
  ['110070', 'Vasant Kunj', 'New Delhi', 'DL', 'DL-NCR', 28.5200, 77.1591],
  ['201301', 'Noida Sector 1', 'Noida', 'UP', 'DL-NCR', 28.5870, 77.3120],
  ['122001', 'Gurugram', 'Gurugram', 'HR', 'DL-NCR', 28.4595, 77.0266],
  ['110092', 'Vivek Vihar', 'New Delhi', 'DL', 'DL-NCR', 28.6720, 77.3150],
  // Mumbai
  ['400001', 'Fort', 'Mumbai', 'MH', 'MH-MUM', 18.9340, 72.8355],
  ['400051', 'Bandra West', 'Mumbai', 'MH', 'MH-MUM', 19.0596, 72.8295],
  ['400070', 'Kurla', 'Mumbai', 'MH', 'MH-MUM', 19.0726, 72.8845],
  ['400093', 'Andheri East', 'Mumbai', 'MH', 'MH-MUM', 19.1136, 72.8697],
  ['400607', 'Thane', 'Thane', 'MH', 'MH-MUM', 19.2183, 72.9781],
  ['400703', 'Vashi', 'Navi Mumbai', 'MH', 'MH-MUM', 19.0770, 72.9986],
  ['400012', 'Parel', 'Mumbai', 'MH', 'MH-MUM', 19.0075, 72.8400],
  // Pune
  ['411001', 'Pune City', 'Pune', 'MH', 'MH-PUN', 18.5204, 73.8567],
  ['411014', 'Viman Nagar', 'Pune', 'MH', 'MH-PUN', 18.5679, 73.9143],
  ['411057', 'Hinjewadi', 'Pune', 'MH', 'MH-PUN', 18.5983, 73.7386],
  ['411028', 'Hadapsar', 'Pune', 'MH', 'MH-PUN', 18.5089, 73.9260],
  ['411045', 'Baner', 'Pune', 'MH', 'MH-PUN', 18.5590, 73.7868],
  ['412105', 'Pimpri', 'Pimpri-Chinchwad', 'MH', 'MH-PUN', 18.6298, 73.7997],
  // Bengaluru
  ['560001', 'Bengaluru GPO', 'Bengaluru', 'KA', 'KA-BLR', 12.9767, 77.5993],
  ['560034', 'Koramangala', 'Bengaluru', 'KA', 'KA-BLR', 12.9352, 77.6245],
  ['560066', 'Whitefield', 'Bengaluru', 'KA', 'KA-BLR', 12.9698, 77.7500],
  ['560095', 'HSR Layout', 'Bengaluru', 'KA', 'KA-BLR', 12.9116, 77.6474],
  ['560103', 'Bellandur', 'Bengaluru', 'KA', 'KA-BLR', 12.9257, 77.6649],
  ['560037', 'Marathahalli', 'Bengaluru', 'KA', 'KA-BLR', 12.9560, 77.7010],
  // Hyderabad
  ['500001', 'Afzal Gunj', 'Hyderabad', 'TG', 'TG-HYD', 17.3730, 78.4800],
  ['500032', 'Gachibowli', 'Hyderabad', 'TG', 'TG-HYD', 17.4401, 78.3489],
  ['500081', 'HITEC City', 'Hyderabad', 'TG', 'TG-HYD', 17.4435, 78.3772],
  ['500034', 'Banjara Hills', 'Hyderabad', 'TG', 'TG-HYD', 17.4126, 78.4480],
  ['500072', 'Kukatpally', 'Hyderabad', 'TG', 'TG-HYD', 17.4948, 78.4000],
  // Chennai
  ['600001', 'Parrys', 'Chennai', 'TN', 'TN-CHE', 13.0928, 80.2870],
  ['600017', 'T Nagar', 'Chennai', 'TN', 'TN-CHE', 13.0418, 80.2341],
  ['600096', 'Perungudi', 'Chennai', 'TN', 'TN-CHE', 12.9650, 80.2430],
  ['600042', 'Velachery', 'Chennai', 'TN', 'TN-CHE', 12.9791, 80.2210],
  ['600119', 'Sholinganallur', 'Chennai', 'TN', 'TN-CHE', 12.9010, 80.2279],
  // Kolkata
  ['700001', 'BBD Bagh', 'Kolkata', 'WB', 'WB-KOL', 22.5697, 88.3499],
  ['700016', 'Park Street', 'Kolkata', 'WB', 'WB-KOL', 22.5535, 88.3520],
  ['700091', 'Salt Lake', 'Kolkata', 'WB', 'WB-KOL', 22.5860, 88.4170],
  ['700156', 'New Town', 'Kolkata', 'WB', 'WB-KOL', 22.5810, 88.4630],
  ['700027', 'Alipore', 'Kolkata', 'WB', 'WB-KOL', 22.5350, 88.3300],
  // Bhopal
  ['462001', 'Bhopal GPO', 'Bhopal', 'MP', 'MP-BHO', 23.2599, 77.4126],
  ['462016', 'Arera Colony', 'Bhopal', 'MP', 'MP-BHO', 23.2100, 77.4300],
  ['462023', 'Kolar Road', 'Bhopal', 'MP', 'MP-BHO', 23.1793, 77.4200],
  ['462039', 'Bagmugalia', 'Bhopal', 'MP', 'MP-BHO', 23.1600, 77.4700],
  ['462042', 'Bawadiya Kalan', 'Bhopal', 'MP', 'MP-BHO', 23.1870, 77.4530],
];

// ── Rate cards: [key, name, orderType, scope, slabs] ─────────────────────────
type Slab = { from: number; to: number | null; flat: number; perKg: number };
const slabSet = (a: number, b: number, c: number, d: number, e: number, f: number): Slab[] => [
  { from: 0, to: 500, flat: a, perKg: 0 },
  { from: 500, to: 5000, flat: b, perKg: c },
  { from: 5000, to: 25000, flat: d, perKg: e },
  { from: 25000, to: null, flat: f, perKg: Math.round(e * 0.8) },
];

const RATE_CARDS: {
  id: string; name: string; orderType: OrderType; scope: 'INTRA_ZONE' | 'INTER_ZONE';
  slabs: Slab[]; effectiveFrom: Date; effectiveTo?: Date; isActive: boolean;
}[] = [
  { id: 'seed_rc_b2c_intra', name: 'B2C Intra-Zone', orderType: 'B2C', scope: 'INTRA_ZONE', slabs: slabSet(4000, 6000, 6000, 30000, 4500, 100000), effectiveFrom: new Date('2026-01-01T00:00:00Z'), isActive: true },
  { id: 'seed_rc_b2c_inter', name: 'B2C Inter-Zone', orderType: 'B2C', scope: 'INTER_ZONE', slabs: slabSet(5000, 8000, 8000, 40000, 6000, 130000), effectiveFrom: new Date('2026-01-01T00:00:00Z'), isActive: true },
  { id: 'seed_rc_b2b_intra', name: 'B2B Intra-Zone', orderType: 'B2B', scope: 'INTRA_ZONE', slabs: slabSet(5000, 7000, 5000, 34000, 4000, 110000), effectiveFrom: new Date('2026-01-01T00:00:00Z'), isActive: true },
  { id: 'seed_rc_b2b_inter', name: 'B2B Inter-Zone', orderType: 'B2B', scope: 'INTER_ZONE', slabs: slabSet(6000, 10000, 7000, 45000, 5500, 140000), effectiveFrom: new Date('2026-01-01T00:00:00Z'), isActive: true },
  // A lapsed prior version of the B2C inter card — proves effective dating.
  { id: 'seed_rc_b2c_inter_v0', name: 'B2C Inter-Zone (2025)', orderType: 'B2C', scope: 'INTER_ZONE', slabs: slabSet(4000, 6500, 6500, 34000, 5000, 110000), effectiveFrom: new Date('2025-01-01T00:00:00Z'), effectiveTo: new Date('2026-01-01T00:00:00Z'), isActive: false },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Pricing + assignment config (fixed ids → idempotent)
  await prisma.pricingConfig.upsert({
    where: { id: 'seed_pricing_v1' },
    update: {},
    create: {
      id: 'seed_pricing_v1', volumetricDivisor: 5000, weightRoundingStepGrams: 500,
      minChargeableWeightGrams: 500, fuelSurchargeBasisPoints: 800, taxBasisPoints: 1800,
      effectiveFrom: new Date('2026-01-01T00:00:00Z'), isActive: true,
    },
  });
  await prisma.assignmentConfig.upsert({
    where: { id: 'seed_assign_v1' }, update: {},
    create: { id: 'seed_assign_v1', isActive: true },
  });

  // Zones
  const zoneId: Record<string, string> = {};
  for (const z of ZONES) {
    const zone = await prisma.zone.upsert({
      where: { code: z.code }, update: { name: z.name, isActive: true },
      create: { code: z.code, name: z.name, isActive: true },
    });
    zoneId[z.code] = zone.id;
  }

  // Service areas
  for (const [pincode, name, city, state, zc, lat, lng] of AREAS) {
    await prisma.serviceArea.upsert({
      where: { pincode },
      update: { name, city, state, zoneId: zoneId[zc], centroidLat: lat, centroidLng: lng, isServiceable: true },
      create: { pincode, name, city, state, zoneId: zoneId[zc], centroidLat: lat, centroidLng: lng, isServiceable: true },
    });
  }

  // Rate cards (+ slabs). Replace slabs each run to stay idempotent.
  for (const rc of RATE_CARDS) {
    await prisma.rateCard.upsert({
      where: { id: rc.id },
      update: { name: rc.name, isActive: rc.isActive, effectiveFrom: rc.effectiveFrom, effectiveTo: rc.effectiveTo ?? null },
      create: {
        id: rc.id, name: rc.name, orderType: rc.orderType, scope: rc.scope,
        effectiveFrom: rc.effectiveFrom, effectiveTo: rc.effectiveTo ?? null, isActive: rc.isActive,
      },
    });
    await prisma.rateSlab.deleteMany({ where: { rateCardId: rc.id } });
    await prisma.rateSlab.createMany({
      data: rc.slabs.map((s, i) => ({
        rateCardId: rc.id, fromWeightGrams: s.from, toWeightGrams: s.to,
        flatPaise: s.flat, perKgPaise: s.perKg, sequence: i,
      })),
    });
  }

  // COD surcharge rules (fixed ids)
  await prisma.surchargeRule.upsert({
    where: { id: 'seed_cod_b2c' }, update: {},
    create: {
      id: 'seed_cod_b2c', code: 'COD', orderType: 'B2C', calcType: 'GREATER_OF',
      flatPaise: 3500, percentBasisPoints: 200, effectiveFrom: new Date('2026-01-01T00:00:00Z'), isActive: true,
    },
  });
  await prisma.surchargeRule.upsert({
    where: { id: 'seed_cod_b2b' }, update: {},
    create: {
      id: 'seed_cod_b2b', code: 'COD', orderType: 'B2B', calcType: 'PERCENT_OF_FREIGHT',
      percentBasisPoints: 500, minPaise: 2000, maxPaise: 20000, effectiveFrom: new Date('2026-01-01T00:00:00Z'), isActive: true,
    },
  });

  // ── Users ──────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.io' }, update: { passwordHash, isActive: true },
    create: { email: 'admin@demo.io', passwordHash, fullName: 'Demo Admin', phone: '+919000000001', role: 'ADMIN' },
  });

  const customerSeed = [
    { email: 'customer@demo.io', name: 'Demo Customer', phone: '+919000000002', type: 'B2C' as OrderType, company: null },
    { email: 'ananya@demo.io', name: 'Ananya Rao', phone: '+919000000010', type: 'B2C' as OrderType, company: null },
    { email: 'vikram@demo.io', name: 'Vikram Shah', phone: '+919000000011', type: 'B2C' as OrderType, company: null },
    { email: 'meera@demo.io', name: 'Meera Nair', phone: '+919000000012', type: 'B2C' as OrderType, company: null },
    { email: 'acme@demo.io', name: 'Acme Traders', phone: '+919000000013', type: 'B2B' as OrderType, company: 'Acme Traders Pvt Ltd' },
    { email: 'globex@demo.io', name: 'Globex Supply', phone: '+919000000014', type: 'B2B' as OrderType, company: 'Globex Supply Co' },
  ];
  const customers: Record<string, string> = {};
  for (const c of customerSeed) {
    const u = await prisma.user.upsert({
      where: { email: c.email }, update: { passwordHash, isActive: true },
      create: {
        email: c.email, passwordHash, fullName: c.name, phone: c.phone, role: 'CUSTOMER',
        customerProfile: { create: { defaultOrderType: c.type, companyName: c.company ?? undefined } },
      },
    });
    customers[c.email] = u.id;
  }

  const agentSeed = [
    { email: 'agent@demo.io', name: 'Demo Agent', code: 'AG-0001', zone: 'MP-BHO', avail: 'AVAILABLE', load: 1, fresh: 5 },
    { email: 'ravi.agent@demo.io', name: 'Ravi Kumar', code: 'AG-0002', zone: 'MH-PUN', avail: 'AVAILABLE', load: 0, fresh: 15 },
    { email: 'sunita.agent@demo.io', name: 'Sunita Devi', code: 'AG-0003', zone: 'MH-PUN', avail: 'ON_DUTY', load: 3, fresh: 60 },
    { email: 'imran.agent@demo.io', name: 'Imran Ali', code: 'AG-0004', zone: 'DL-NCR', avail: 'AVAILABLE', load: 2, fresh: 8 },
    { email: 'priya.agent@demo.io', name: 'Priya Menon', code: 'AG-0005', zone: 'KA-BLR', avail: 'AVAILABLE', load: 1, fresh: 30 },
    { email: 'karan.agent@demo.io', name: 'Karan Singh', code: 'AG-0006', zone: 'TG-HYD', avail: 'OFFLINE', load: 0, fresh: 240 },
    { email: 'deepa.agent@demo.io', name: 'Deepa Iyer', code: 'AG-0007', zone: 'MH-MUM', avail: 'AVAILABLE', load: 4, fresh: 12 },
    { email: 'arjun.agent@demo.io', name: 'Arjun Patil', code: 'AG-0008', zone: 'MH-PUN', avail: 'AVAILABLE', load: 2, fresh: 45 },
  ];
  const zoneCentroid: Record<string, [number, number]> = {};
  for (const [, , , , zc, lat, lng] of AREAS) {
    if (!zoneCentroid[zc]) zoneCentroid[zc] = [lat, lng];
  }
  for (const a of agentSeed) {
    const u = await prisma.user.upsert({
      where: { email: a.email }, update: { passwordHash, isActive: true },
      create: { email: a.email, passwordHash, fullName: a.name, phone: '+9190000' + a.code.slice(-5), role: 'AGENT' },
    });
    const [lat, lng] = zoneCentroid[a.zone];
    await prisma.agent.upsert({
      where: { userId: u.id },
      update: { availability: a.avail as never, homeZoneId: zoneId[a.zone], activeOrderCount: a.load },
      create: {
        userId: u.id, agentCode: a.code, availability: a.avail as never, homeZoneId: zoneId[a.zone],
        currentLat: lat, currentLng: lng, locationUpdatedAt: new Date(Date.now() - a.fresh * 60_000),
        activeOrderCount: a.load, maxConcurrentOrders: 5, vehicleType: 'BIKE',
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    [
      `Seed complete: ${ZONES.length} zones, ${AREAS.length} areas, ${RATE_CARDS.length} rate cards, ` +
        `${customerSeed.length} customers, ${agentSeed.length} agents.`,
      `Demo logins (password: ${DEMO_PASSWORD}):`,
      `  ADMIN     admin@demo.io     (${admin.id})`,
      `  CUSTOMER  customer@demo.io`,
      `  AGENT     agent@demo.io`,
    ].join('\n'),
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
