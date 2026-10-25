/**
 * The grAIt mark, as plain inline-styled JSX.
 *
 * Rendered by Satori inside `next/og` `ImageResponse` (favicon, apple icon, OG
 * images), so it must avoid Tailwind classes and anything outside Satori's
 * supported CSS subset — inline styles and flexbox only. Same geometry as
 * `components/logo.tsx` and `public/icon.svg`.
 */
export function BrandMark({ size, radius }: { size: number; radius?: number }) {
  return (
    <div
      style={{
        background: "#07080c",
        borderRadius: radius ?? Math.round(size * 0.22),
        display: "flex",
        height: size,
        width: size,
      }}
    >
      {/* No <title>: Satori draws it as visible text over the glyph. */}
      <svg aria-hidden="true" height={size} viewBox="0 0 64 64" width={size}>
        <circle
          cx="22"
          cy="38"
          fill="none"
          r="9"
          stroke="#67e8f9"
          strokeWidth="6"
        />
        <path
          d="M34 29v18"
          stroke="#67e8f9"
          strokeLinecap="round"
          strokeWidth="6"
        />
        <path
          d="M46 31v16"
          stroke="#67e8f9"
          strokeLinecap="round"
          strokeWidth="6"
        />
        <circle cx="46" cy="19" fill="#ffb35c" r="4.5" />
      </svg>
    </div>
  );
}
