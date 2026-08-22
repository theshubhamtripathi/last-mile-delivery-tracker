import { formatINR } from '@lmd/shared';

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface TemplatePayload {
  templateKey: string;
  orderNumber: string;
  customerName: string;
  totalPaise: number;
  fromStatus?: string;
  reason?: string;
  isAdminOverride?: boolean;
  requestedDate?: string;
  [key: string]: unknown;
}

function shell(title: string, bodyLines: string[], trackingUrl: string): string {
  return [
    `<div style="font-family:sans-serif;max-width:520px">`,
    `<h2 style="color:#12181D">${title}</h2>`,
    ...bodyLines.map((l) => `<p style="color:#12181D">${l}</p>`),
    `<p><a href="${trackingUrl}" style="color:#1B4DE4">Track your shipment →</a></p>`,
    `<hr style="border:none;border-top:1px solid #CFD6DA"/>`,
    `<p style="color:#6b7280;font-size:12px">Last-Mile Delivery Tracker</p>`,
    `</div>`,
  ].join('');
}

/** Plain typed template functions (charter §11). One per lifecycle moment. */
export function renderTemplate(p: TemplatePayload, trackingUrl: string): RenderedTemplate {
  const n = p.orderNumber;
  const total = formatINR(p.totalPaise);
  switch (p.templateKey) {
    case 'ORDER_CONFIRMED':
      return {
        subject: `Order ${n} confirmed — ${total}`,
        html: shell(`Order ${n} confirmed`, [
          `Hi ${p.customerName}, your shipment is booked.`,
          `Total charge: <strong>${total}</strong> (full breakdown on your order page).`,
        ], trackingUrl),
        text: `Order ${n} confirmed. Total ${total}. Track: ${trackingUrl}`,
      };
    case 'AGENT_ASSIGNED':
      return {
        subject: `A delivery agent is assigned to ${n}`,
        html: shell(`Agent assigned to ${n}`, ['A delivery partner has been assigned and will pick up your parcel shortly.'], trackingUrl),
        text: `Order ${n}: an agent has been assigned. Track: ${trackingUrl}`,
      };
    case 'STATUS_PICKED_UP':
      return {
        subject: `${n} picked up`,
        html: shell(`${n} picked up`, ['Your parcel has been picked up and is on its way into our network.'], trackingUrl),
        text: `Order ${n} picked up. Track: ${trackingUrl}`,
      };
    case 'STATUS_IN_TRANSIT':
      return {
        subject: `${n} in transit`,
        html: shell(`${n} in transit`, ['Your parcel is moving toward the destination zone.'], trackingUrl),
        text: `Order ${n} in transit. Track: ${trackingUrl}`,
      };
    case 'STATUS_OUT_FOR_DELIVERY':
      return {
        subject: `${n} out for delivery`,
        html: shell(`${n} out for delivery`, ['Your parcel is out for delivery today.'], trackingUrl),
        text: `Order ${n} is out for delivery. Track: ${trackingUrl}`,
      };
    case 'DELIVERED':
      return {
        subject: `${n} delivered`,
        html: shell(`${n} delivered`, ['Your parcel has been delivered. Thank you for shipping with us.'], trackingUrl),
        text: `Order ${n} delivered. ${trackingUrl}`,
      };
    case 'DELIVERY_FAILED':
      return {
        subject: `Delivery attempt for ${n} failed`,
        html: shell(`Delivery attempt failed for ${n}`, [
          `We could not deliver your parcel${p.reason ? ` (${p.reason})` : ''}.`,
          `You can pick a new delivery date on the tracking page.`,
        ], trackingUrl),
        text: `Order ${n}: delivery failed. Reschedule: ${trackingUrl}`,
      };
    case 'RESCHEDULED':
      return {
        subject: `${n} rescheduled`,
        html: shell(`${n} rescheduled`, [
          `Your delivery has been rescheduled${p.requestedDate ? ` to ${new Date(p.requestedDate).toDateString()}` : ''} and reassigned to a delivery partner.`,
        ], trackingUrl),
        text: `Order ${n} rescheduled. Track: ${trackingUrl}`,
      };
    default:
      return {
        subject: `Update on ${n}`,
        html: shell(`Update on ${n}`, ['There is an update on your order.'], trackingUrl),
        text: `Update on order ${n}. Track: ${trackingUrl}`,
      };
  }
}
