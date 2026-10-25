import { getAppUrl } from "@/lib/app-url";

// Server-side funnel events (seat reserved, payment reported/confirmed) sent
// to the self-hosted Umami. Fire-and-forget: statistics must never block or
// fail a booking.
const { UMAMI_URL, UMAMI_WEBSITE_ID, NEXT_PUBLIC_UMAMI_WEBSITE_ID } =
  process.env;
const WEBSITE_ID = UMAMI_WEBSITE_ID ?? NEXT_PUBLIC_UMAMI_WEBSITE_ID;
// Umami drops requests whose user agent looks like a bot.
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 BookGrait-Server";

export function trackServerEvent(
  name: string,
  data: Record<string, string | number | null | undefined>,
  path = "/"
) {
  if (!(UMAMI_URL && WEBSITE_ID)) {
    return;
  }
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== null && v !== undefined)
  );
  fetch(`${UMAMI_URL}/api/send`, {
    body: JSON.stringify({
      payload: {
        data: clean,
        hostname: new URL(getAppUrl()).hostname,
        language: "en",
        name,
        url: path,
        website: WEBSITE_ID,
      },
      type: "event",
    }),
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
    method: "POST",
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    // ignore: statistics are best-effort
  });
}
