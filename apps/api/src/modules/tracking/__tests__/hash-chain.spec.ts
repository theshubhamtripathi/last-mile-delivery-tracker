import { computeEventHash } from '../hash-chain';

const base = {
  orderId: 'ord_1',
  sequence: 1,
  fromStatus: null as string | null,
  toStatus: 'CREATED',
  actorUserId: 'usr_1',
  occurredAt: new Date('2026-08-22T10:00:00.000Z'),
  previousHash: null as string | null,
};

describe('hash-chain', () => {
  it('is deterministic for identical input', () => {
    expect(computeEventHash(base)).toBe(computeEventHash({ ...base }));
  });

  it('produces a 64-char hex sha256 digest', () => {
    expect(computeEventHash(base)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes when any field changes (tamper-evident)', () => {
    const h0 = computeEventHash(base);
    expect(computeEventHash({ ...base, toStatus: 'CANCELLED' })).not.toBe(h0);
    expect(computeEventHash({ ...base, actorUserId: 'usr_2' })).not.toBe(h0);
    expect(computeEventHash({ ...base, sequence: 2 })).not.toBe(h0);
    expect(computeEventHash({ ...base, occurredAt: new Date('2026-08-22T10:00:01.000Z') })).not.toBe(h0);
  });

  it('links to the previous hash so a broken earlier link cascades', () => {
    const first = computeEventHash(base);
    const second = computeEventHash({ ...base, sequence: 2, fromStatus: 'CREATED', toStatus: 'ASSIGNED', previousHash: first });
    const secondWithTamperedPrev = computeEventHash({ ...base, sequence: 2, fromStatus: 'CREATED', toStatus: 'ASSIGNED', previousHash: 'tampered' });
    expect(second).not.toBe(secondWithTamperedPrev);
  });
});
