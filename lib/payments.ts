// Paid events without a payment processor: the guest pays through the host's
// PayPal.me / Revolut.me link, quoting a reference, and the host confirms the
// payment in the dashboard (which approves the RSVP and sends the ticket).

import { customAlphabet } from "nanoid";

export interface EventPricing {
  currency: string;
  earlyBirdEndsAt: Date | null;
  earlyBirdPriceCents: number | null;
  earlyBirdSeats: number | null;
  priceCents: number | null;
}

export type PriceTier = "early_bird" | "regular";

export interface Quote {
  priceCents: number;
  tier: PriceTier;
}

const TRAILING_SLASHES = /\/+$/;

export function isPaidEvent(event: Pick<EventPricing, "priceCents">) {
  return typeof event.priceCents === "number" && event.priceCents > 0;
}

/**
 * The price a guest registering now pays. Early bird applies while its end
 * date has not passed and fewer than `earlyBirdSeats` guests hold an early
 * bird booking. Returns null for a free event.
 */
export function quotePrice(
  event: EventPricing,
  earlyBirdTaken: number,
  now: Date = new Date()
): Quote | null {
  if (!isPaidEvent(event)) {
    return null;
  }
  const regular = { priceCents: event.priceCents as number, tier: "regular" };
  if (typeof event.earlyBirdPriceCents !== "number") {
    return regular as Quote;
  }
  const beforeDeadline = !event.earlyBirdEndsAt || now < event.earlyBirdEndsAt;
  const seatsLeft =
    typeof event.earlyBirdSeats !== "number" ||
    earlyBirdTaken < event.earlyBirdSeats;
  return beforeDeadline && seatsLeft
    ? { priceCents: event.earlyBirdPriceCents, tier: "early_bird" }
    : (regular as Quote);
}

export function formatPrice(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

// No 0/O/1/I so the reference survives being typed into a payment note.
const referenceId = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

export function createPaymentReference(prefix = "OL") {
  return `${prefix}-${referenceId()}`;
}

export interface PaymentLink {
  label: string;
  url: string;
}

function cleanBase(url: string | undefined) {
  const trimmed = url?.trim().replace(TRAILING_SLASHES, "");
  return trimmed?.startsWith("https://") ? trimmed : null;
}

/**
 * Pay buttons for the host's configured accounts. PayPal.me takes the amount
 * in the URL; Revolut.me opens the profile and the guest enters the amount.
 */
export function paymentLinks(
  cents: number,
  currency: string,
  env: Record<string, string | undefined> = process.env
): PaymentLink[] {
  const links: PaymentLink[] = [];
  const paypal = cleanBase(env.PAYPAL_ME_URL);
  if (paypal) {
    const amount = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
    links.push({ label: "PayPal", url: `${paypal}/${amount}${currency}` });
  }
  const revolut = cleanBase(env.REVOLUT_ME_URL);
  if (revolut) {
    links.push({ label: "Revolut", url: revolut });
  }
  return links;
}
