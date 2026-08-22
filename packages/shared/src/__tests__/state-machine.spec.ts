import {
  allowedNextStatuses,
  checkTransition,
  isTerminal,
} from '../state-machine';

describe('state-machine', () => {
  it('permits an agent to advance ASSIGNED -> PICKED_UP', () => {
    expect(checkTransition('ASSIGNED', 'PICKED_UP', 'AGENT').allowed).toBe(true);
  });

  it('rejects an agent cancelling an order (role not permitted)', () => {
    const r = checkTransition('ASSIGNED', 'CANCELLED', 'AGENT');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('ROLE_NOT_PERMITTED');
  });

  it('rejects an illegal jump CREATED -> DELIVERED', () => {
    const r = checkTransition('CREATED', 'DELIVERED', 'ADMIN');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('INVALID_TRANSITION');
  });

  it('treats DELIVERED and CANCELLED as terminal', () => {
    expect(isTerminal('DELIVERED')).toBe(true);
    expect(isTerminal('CANCELLED')).toBe(true);
    expect(checkTransition('DELIVERED', 'FAILED', 'ADMIN').reason).toBe('TERMINAL');
  });

  it('walks the reschedule loop FAILED -> RESCHEDULED -> ASSIGNED', () => {
    expect(checkTransition('FAILED', 'RESCHEDULED', 'CUSTOMER').allowed).toBe(true);
    expect(checkTransition('RESCHEDULED', 'ASSIGNED', 'ADMIN').allowed).toBe(true);
    expect(allowedNextStatuses('OUT_FOR_DELIVERY')).toEqual(['DELIVERED', 'FAILED']);
  });
});
