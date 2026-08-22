/**
 * Idempotent seed. Re-running never duplicates rows (everything upserts on a
 * natural key). Phase 1 seeds the config rows, a few zones/areas, and the three
 * demo logins so the hosted skeleton is usable; the full demo dataset (8 zones,
 * ~60 areas, rate cards, ~40 orders across every status) is layered on in later
 * phases. Demo credentials are printed at the end and mirrored in the README.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo@1234';

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Pricing + assignment config (single active row each) ----------------
  const existingPricing = await prisma.pricingConfig.findFirst({
    where: { isActive: true },
  });
  if (!existingPricing) {
    await prisma.pricingConfig.create({
      data: {
        volumetricDivisor: 5000,
        weightRoundingStepGrams: 500,
        minChargeableWeightGrams: 500,
        fuelSurchargeBasisPoints: 800, // 8%
        taxBasisPoints: 1800, // 18% GST
        effectiveFrom: new Date('2026-01-01T00:00:00Z'),
        isActive: true,
      },
    });
  }
  const existingAssign = await prisma.assignmentConfig.findFirst({
    where: { isActive: true },
  });
  if (!existingAssign) {
    await prisma.assignmentConfig.create({ data: { isActive: true } });
  }

  // --- Zones (seed a starter set; expanded in Phase 2) ---------------------
  const zoneSeed = [
    { code: 'MP-BHO', name: 'Bhopal' },
    { code: 'MH-PUN', name: 'Pune' },
    { code: 'DL-NCR', name: 'Delhi NCR' },
    { code: 'KA-BLR', name: 'Bengaluru' },
  ];
  const zones: Record<string, string> = {};
  for (const z of zoneSeed) {
    const zone = await prisma.zone.upsert({
      where: { code: z.code },
      update: { name: z.name, isActive: true },
      create: { code: z.code, name: z.name, isActive: true },
    });
    zones[z.code] = zone.id;
  }

  // --- Service areas (a handful; full list in Phase 2) ---------------------
  const areaSeed = [
    { pincode: '462001', name: 'Bhopal GPO', city: 'Bhopal', state: 'MP', zone: 'MP-BHO', lat: 23.2599, lng: 77.4126 },
    { pincode: '411001', name: 'Pune City', city: 'Pune', state: 'MH', zone: 'MH-PUN', lat: 18.5204, lng: 73.8567 },
    { pincode: '110001', name: 'Connaught Place', city: 'New Delhi', state: 'DL', zone: 'DL-NCR', lat: 28.6304, lng: 77.2177 },
    { pincode: '560001', name: 'Bengaluru GPO', city: 'Bengaluru', state: 'KA', zone: 'KA-BLR', lat: 12.9767, lng: 77.5993 },
  ];
  for (const a of areaSeed) {
    await prisma.serviceArea.upsert({
      where: { pincode: a.pincode },
      update: {
        name: a.name,
        city: a.city,
        state: a.state,
        zoneId: zones[a.zone],
        centroidLat: a.lat,
        centroidLng: a.lng,
        isServiceable: true,
      },
      create: {
        pincode: a.pincode,
        name: a.name,
        city: a.city,
        state: a.state,
        zoneId: zones[a.zone],
        centroidLat: a.lat,
        centroidLng: a.lng,
        isServiceable: true,
      },
    });
  }

  // --- Demo users (three roles) --------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.io' },
    update: { passwordHash, isActive: true },
    create: {
      email: 'admin@demo.io',
      passwordHash,
      fullName: 'Demo Admin',
      phone: '+919000000001',
      role: 'ADMIN',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@demo.io' },
    update: { passwordHash, isActive: true },
    create: {
      email: 'customer@demo.io',
      passwordHash,
      fullName: 'Demo Customer',
      phone: '+919000000002',
      role: 'CUSTOMER',
      customerProfile: { create: { defaultOrderType: 'B2C' } },
    },
  });

  const agentUser = await prisma.user.upsert({
    where: { email: 'agent@demo.io' },
    update: { passwordHash, isActive: true },
    create: {
      email: 'agent@demo.io',
      passwordHash,
      fullName: 'Demo Agent',
      phone: '+919000000003',
      role: 'AGENT',
    },
  });
  await prisma.agent.upsert({
    where: { userId: agentUser.id },
    update: { availability: 'AVAILABLE', homeZoneId: zones['MP-BHO'] },
    create: {
      userId: agentUser.id,
      agentCode: 'AG-0001',
      availability: 'AVAILABLE',
      homeZoneId: zones['MP-BHO'],
      currentLat: 23.2599,
      currentLng: 77.4126,
      locationUpdatedAt: new Date(),
      maxConcurrentOrders: 5,
      vehicleType: 'BIKE',
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    [
      'Seed complete. Demo logins (password: ' + DEMO_PASSWORD + '):',
      `  ADMIN     admin@demo.io     (${admin.id})`,
      `  CUSTOMER  customer@demo.io  (${customer.id})`,
      `  AGENT     agent@demo.io     (${agentUser.id})`,
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
