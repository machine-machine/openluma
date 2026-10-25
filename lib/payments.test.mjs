import { expect, test } from "bun:test";

const REFERENCE = /^OL-[2-9A-HJ-NP-Z]{6}$/;
const { createPaymentReference, formatPrice, paymentLinks, quotePrice } =
  await import("./payments.ts");

const event = {
  currency: "EUR",
  earlyBirdEndsAt: new Date("2026-10-27T23:00:00Z"),
  earlyBirdPriceCents: 9900,
  earlyBirdSeats: 6,
  priceCents: 14_900,
};

test("free events have no quote", () => {
  expect(quotePrice({ ...event, priceCents: null }, 0)).toBeNull();
  expect(quotePrice({ ...event, priceCents: 0 }, 0)).toBeNull();
});

test("early bird applies before the deadline while seats remain", () => {
  const now = new Date("2026-10-26T10:00:00Z");
  expect(quotePrice(event, 0, now)).toEqual({
    priceCents: 9900,
    tier: "early_bird",
  });
  expect(quotePrice(event, 5, now)?.tier).toBe("early_bird");
});

test("regular price once early bird seats are taken", () => {
  const now = new Date("2026-10-26T10:00:00Z");
  expect(quotePrice(event, 6, now)).toEqual({
    priceCents: 14_900,
    tier: "regular",
  });
});

test("regular price after the early bird deadline", () => {
  expect(quotePrice(event, 0, new Date("2026-10-27T23:00:00Z"))?.tier).toBe(
    "regular"
  );
});

test("early bird without a deadline or seat limit never expires", () => {
  const open = { ...event, earlyBirdEndsAt: null, earlyBirdSeats: null };
  expect(quotePrice(open, 999, new Date("2030-01-01"))?.tier).toBe(
    "early_bird"
  );
});

test("no early bird price means regular only", () => {
  expect(quotePrice({ ...event, earlyBirdPriceCents: null }, 0)?.tier).toBe(
    "regular"
  );
});

test("payment links", () => {
  expect(
    paymentLinks(9900, "EUR", {
      PAYPAL_ME_URL: "https://paypal.me/someone/",
      REVOLUT_ME_URL: "https://revolut.me/someone",
    })
  ).toEqual([
    { label: "PayPal", url: "https://paypal.me/someone/99EUR" },
    { label: "Revolut", url: "https://revolut.me/someone" },
  ]);
  expect(
    paymentLinks(1250, "EUR", { PAYPAL_ME_URL: "https://paypal.me/x" })
  ).toEqual([{ label: "PayPal", url: "https://paypal.me/x/12.50EUR" }]);
  expect(paymentLinks(9900, "EUR", { PAYPAL_ME_URL: "http://evil" })).toEqual(
    []
  );
});

test("references and prices are readable", () => {
  expect(createPaymentReference()).toMatch(REFERENCE);
  expect(formatPrice(9900)).toBe("€99");
  expect(formatPrice(1250)).toBe("€12.50");
});
