import type React from "react";
import { cn } from "@/lib/utils";

// grAIt mark: "ai" in cyan on a dark tile with an amber orbit (same as the
// grait.io favicon). `public/icon.svg` and `components/seo/brand-mark.tsx`
// draw the same geometry.
const ACCENT = "#67e8f9";
const ORBIT = "#ffb35c";

function Mark() {
  return (
    <>
      <rect fill="#07080c" height="24" rx="5.25" width="24" />
      <circle
        cx="8.25"
        cy="14.25"
        fill="none"
        r="3.4"
        stroke={ACCENT}
        strokeWidth="2.25"
      />
      <path
        d="M12.75 10.9v6.75M17.25 11.6v6"
        stroke={ACCENT}
        strokeLinecap="round"
        strokeWidth="2.25"
      />
      <circle cx="17.25" cy="7.1" fill={ORBIT} r="1.7" />
    </>
  );
}

export function LogoIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      className={cn("size-6", className)}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Mark />
    </svg>
  );
}

/** Wordmark in the grait.io style: monospace, lowercase, "ai" highlighted. */
export function Logo({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      aria-label="BookGrait"
      className={cn("h-5", className)}
      fill="none"
      role="img"
      viewBox="0 0 124 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Mark />
      <text
        fill="currentColor"
        fontFamily="ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
        fontSize="16"
        fontWeight="600"
        x="30"
        y="17.5"
      >
        <tspan fillOpacity="0.55">book</tspan>
        <tspan>gr</tspan>
        <tspan fill="#0891b2">ai</tspan>
        <tspan>t</tspan>
      </text>
    </svg>
  );
}
