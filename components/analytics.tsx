"use client";

import Script from "next/script";
import { useEffect } from "react";

const SCRIPT_URL = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const UTM_KEY = "bookgrait-utm";
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign"] as const;

export type CampaignSource = Partial<
  Record<(typeof UTM_FIELDS)[number], string>
>;

/** The campaign this visitor arrived with (kept for the tab's session). */
export function readCampaignSource(): CampaignSource | undefined {
  let source: CampaignSource | undefined;
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    source = raw ? (JSON.parse(raw) as CampaignSource) : undefined;
  } catch {
    // storage blocked or corrupt: the booking just has no source
    source = undefined;
  }
  return source;
}

/**
 * Cookieless Umami statistics plus campaign capture: the first utm_* tags a
 * visitor lands with survive sign-in (incl. the Google round trip, same tab)
 * and are stored on their booking.
 */
export function Analytics() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source: CampaignSource = {};
    for (const field of UTM_FIELDS) {
      const value = params.get(field)?.slice(0, 100);
      if (value) {
        source[field] = value;
      }
    }
    if (Object.keys(source).length > 0) {
      try {
        sessionStorage.setItem(UTM_KEY, JSON.stringify(source));
      } catch {
        // storage blocked: bookings just won't carry a source
      }
    }
  }, []);

  if (!(SCRIPT_URL && WEBSITE_ID)) {
    return null;
  }
  return (
    <Script
      data-website-id={WEBSITE_ID}
      defer
      src={SCRIPT_URL}
      strategy="afterInteractive"
    />
  );
}
