import type { Metadata } from "next";
import { CtaSection } from "@/components/layout/cta-section";
import { HeroSection } from "@/components/layout/hero-section";
import { buildPageMetadata } from "@/lib/seo/metadata";

const HOME_DESCRIPTION =
  "Book hands-on AI workshops and sessions by grAIt with Mariusz Kreft. Pick a date, reserve your seat, pay by PayPal or Revolut.";

export const metadata: Metadata = buildPageMetadata({
  description: HOME_DESCRIPTION,
  // `app/opengraph-image.tsx` lives on an ancestor segment, so it is dropped by
  // this page's own `openGraph` unless pointed at explicitly.
  images: ["/opengraph-image"],
  path: "/",
  // Title is intentionally omitted: the root layout supplies the default
  // (untemplated) one, and setting it here would render "… · BookGrait".
});

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <HeroSection />

      <CtaSection />
    </div>
  );
}
