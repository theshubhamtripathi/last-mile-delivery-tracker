/**
 * The order status lifecycle as a single source of truth. Services ask this
 * module whether a transition is legal and who may perform it — they never
 * scatter status comparisons of their own. Admin override is deliberately NOT
 * modelled here: an override may set any status, bypassing these rules, and is
 * gated separately (reason required, audit-logged) so the two concerns stay
 * distinct.
 */

export const ORDER_STATUSES = [
  'CREATED',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
  'RESCHEDULED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ROLES = ['CUSTOMER', 'AGENT', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export interface Transition {
  to: OrderStatus;
  /** Roles permitted to make this transition through the normal (non-override) path. */
  roles: Role[];
}

/**
 * Allowed forward transitions per status. A status absent from a source's list
 * is illegal by construction. Terminal states map to an empty list.
 */
export const TRANSITIONS: Record<OrderStatus, Transition[]> = {
  CREATED: [
    { to: 'ASSIGNED', roles: ['ADMIN'] },
    { to: 'CANCELLED', roles: ['CUSTOMER', 'ADMIN'] },
  ],
  ASSIGNED: [
    { to: 'PICKED_UP', roles: ['AGENT'] },
    { to: 'CANCELLED', roles: ['CUSTOMER', 'ADMIN'] },
  ],
  PICKED_UP: [{ to: 'IN_TRANSIT', roles: ['AGENT'] }],
  IN_TRANSIT: [{ to: 'OUT_FOR_DELIVERY', roles: ['AGENT'] }],
  OUT_FOR_DELIVERY: [
    { to: 'DELIVERED', roles: ['AGENT'] },
    { to: 'FAILED', roles: ['AGENT'] },
  ],
  FAILED: [{ to: 'RESCHEDULED', roles: ['CUSTOMER', 'ADMIN'] }],
  RESCHEDULED: [{ to: 'ASSIGNED', roles: ['ADMIN'] }],
  DELIVERED: [],
  CANCELLED: [],
};

export const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'DELIVERED',
  'CANCELLED',
]);

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function allowedNextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from].map((t) => t.to);
}

/** Roles permitted to move from -> to on the normal path; empty if illegal. */
export function rolesForTransition(from: OrderStatus, to: OrderStatus): Role[] {
  return TRANSITIONS[from].find((t) => t.to === to)?.roles ?? [];
}

export interface TransitionCheck {
  allowed: boolean;
  /** Present when not allowed: why, so the API can return a precise message. */
  reason?: 'TERMINAL' | 'INVALID_TRANSITION' | 'ROLE_NOT_PERMITTED';
  allowedNext: OrderStatus[];
}

/**
 * Validate a normal (non-override) transition for a given actor role.
 * Admin overrides do not go through here.
 */
export function checkTransition(
  from: OrderStatus,
  to: OrderStatus,
  role: Role,
): TransitionCheck {
  const allowedNext = allowedNextStatuses(from);
  if (isTerminal(from)) {
    return { allowed: false, reason: 'TERMINAL', allowedNext };
  }
  const transition = TRANSITIONS[from].find((t) => t.to === to);
  if (!transition) {
    return { allowed: false, reason: 'INVALID_TRANSITION', allowedNext };
  }
  if (!transition.roles.includes(role)) {
    return { allowed: false, reason: 'ROLE_NOT_PERMITTED', allowedNext };
  }
  return { allowed: true, allowedNext };
}
