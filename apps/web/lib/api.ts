/**
 * Typed fetch client. The app has ~two dozen endpoints, so a client-cache
 * dependency is not justified (charter §3): this wrapper plus the useAsync /
 * usePolling hooks is enough. `credentials: 'include'` carries the httpOnly
 * session cookies; every failure parses the one error envelope.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
  requestId: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const body = data as ApiErrorBody | undefined;
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'ERROR',
      body?.error?.message ?? res.statusText,
      body?.error?.details,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
};

// ── Domain types (subset the UI consumes) ───────────────────────────────────
export type Role = 'CUSTOMER' | 'AGENT' | 'ADMIN';
export type OrderStatus =
  | 'CREATED' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RESCHEDULED' | 'CANCELLED';

export interface SessionUser {
  userId: string;
  email: string;
  role: Role;
  fullName: string;
}

export interface SurchargeLine { code: string; paise: number; basis: string }
export interface PricingBreakdown {
  scope: 'INTRA_ZONE' | 'INTER_ZONE';
  volumetricWeightGrams: number;
  chargeableWeightGrams: number;
  chargeableBasis: 'ACTUAL' | 'VOLUMETRIC';
  rateCardVersionLabel: string;
  freightPaise: number;
  fuelSurchargePaise: number;
  surcharges: SurchargeLine[];
  taxableBasePaise: number;
  taxPaise: number;
  totalPaise: number;
  explain: string[];
}

export interface QuoteResponse {
  quoteToken: string;
  expiresAt: string;
  pickupZoneId: string;
  dropZoneId: string;
  pickupZoneResolution: string;
  dropZoneResolution: string;
  breakdown: PricingBreakdown;
}

export interface TimelineEvent {
  sequence: number;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorRole: Role;
  actorName: string;
  isAdminOverride: boolean;
  reason: string | null;
  occurredAt: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: SessionUser }>('/auth/login', { email, password }),
  register: (payload: Record<string, unknown>) =>
    api.post<{ user: SessionUser }>('/auth/register', payload),
  logout: () => api.post<{ ok: boolean }>('/auth/logout'),
  me: () => api.get<{ id: string; email: string; fullName: string; role: Role }>('/auth/me'),
};

export const publicApi = {
  track: (trackingNumber: string) =>
    api.get<Record<string, unknown>>(`/track/${trackingNumber}`),
};

export interface OrderSummary {
  id: string;
  orderNumber: string;
  currentStatus: OrderStatus;
  orderType: string;
  paymentType: string;
  totalPaise: number;
  chargeableWeightGrams: number;
  createdAt: string;
  promisedDate: string | null;
  pickupZone?: { code: string };
  dropZone?: { code: string };
  customer?: { fullName: string };
  assignedAgent?: { user: { fullName: string } } | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

export const ordersApi = {
  quote: (payload: Record<string, unknown>) => api.post<QuoteResponse>('/quotes', payload),
  create: (payload: Record<string, unknown>) => api.post<Record<string, unknown>>('/orders', payload),
  list: (query = '') => api.get<Paginated<OrderSummary>>(`/orders${query}`),
  get: (id: string) => api.get<Record<string, unknown>>(`/orders/${id}`),
  tracking: (id: string) => api.get<TimelineEvent[]>(`/orders/${id}/tracking`),
  verify: (id: string) => api.get<{ valid: boolean; eventsVerified: number }>(`/orders/${id}/tracking/verify`),
  status: (id: string, body: Record<string, unknown>) => api.post(`/orders/${id}/status`, body),
  assign: (id: string, body: Record<string, unknown>) => api.post(`/orders/${id}/assign`, body),
  reschedule: (id: string, requestedDate: string) => api.post(`/orders/${id}/reschedule`, { requestedDate }),
};

export const adminApi = {
  metrics: () => api.get<Record<string, unknown>>('/admin/dashboard/metrics'),
  zones: () => api.get<Array<{ id: string; code: string; name: string; isActive: boolean; _count?: { serviceAreas: number } }>>('/admin/zones'),
  areas: (zoneId?: string) => api.get<Record<string, unknown>[]>(`/admin/areas${zoneId ? `?zoneId=${zoneId}` : ''}`),
  rateCards: () => api.get<Record<string, unknown>[]>('/admin/rate-cards'),
  simulate: (payload: Record<string, unknown>) => api.post<PricingBreakdown>('/admin/rate-cards/simulate', payload),
  notifications: () => api.get<Record<string, unknown>[]>('/admin/notifications'),
  auditLogs: () => api.get<Record<string, unknown>[]>('/admin/audit-logs'),
  agents: () => api.get<Array<{ id: string; agentCode: string; availability: string; activeOrderCount: number; maxConcurrentOrders: number; homeZone: { code: string }; user: { fullName: string } }>>('/admin/agents'),
};

export const agentApi = {
  myOrders: () => api.get<Record<string, unknown>[]>('/agents/me/orders'),
  setAvailability: (availability: string) => api.patch('/agents/me/availability', { availability }),
  setLocation: (lat: number, lng: number) => api.patch('/agents/me/location', { lat, lng }),
};
