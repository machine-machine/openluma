import { renderBrandOgImage } from "@/lib/seo/brand-og-image";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/event-og-image";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "BookGrait | Workshops & sessions by grAIt";

export default function Image() {
  return renderBrandOgImage({
    subtitle: "Hands-on AI workshops and sessions by grAIt.",
    title: "Events, end to end.",
  });
}
