import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * HexNinja brand mark — a faceted hexagon wearing a ninja visor.
 * Purely presentational SVG; no behaviour.
 */
export function BrandMark({ className, size = 32 }: { className?: string; size?: number }) {
  const id = useId().replace(/:/g, "");
  const grad = `hx-grad-${id}`;
  const shine = `hx-shine-${id}`;
  const clip = `hx-clip-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={grad} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset="0.55" stopColor="#6366F1" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id={shine} x1="16" y1="2" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clip}>
          <path d="M16 1.5 28.6 8.75v14.5L16 30.5 3.4 23.25V8.75L16 1.5Z" />
        </clipPath>
      </defs>

      {/* Hex body */}
      <path d="M16 1.5 28.6 8.75v14.5L16 30.5 3.4 23.25V8.75L16 1.5Z" fill={`url(#${grad})`} />
      <path d="M16 1.5 28.6 8.75 16 16 3.4 8.75 16 1.5Z" fill={`url(#${shine})`} />

      <g clipPath={`url(#${clip})`}>
        {/* Visor band */}
        <path d="M0 12.2 32 11v8.2L0 20.4z" fill="#0B0B1A" fillOpacity="0.92" />
        {/* Headband tail */}
        <path d="M27.5 12.6 32 10.6v3.2z" fill="#0B0B1A" fillOpacity="0.6" />
      </g>

      {/* Eyes — sharp, angled slits */}
      <path d="M7.6 14.3 14.3 15.9 13.5 17.9 8.6 16.9Z" fill="#E0F7FF" />
      <path d="M24.4 14.3 17.7 15.9 18.5 17.9 23.4 16.9Z" fill="#E0F7FF" />

      {/* Edge highlight */}
      <path
        d="M16 1.5 28.6 8.75v14.5L16 30.5 3.4 23.25V8.75L16 1.5Z"
        stroke="#fff"
        strokeOpacity="0.18"
        strokeWidth="0.8"
      />
    </svg>
  );
}

/** "HexNinja" wordmark with gradient accent. */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight leading-none", className)}>
      <span className="text-foreground">Hex</span>
      <span className="bg-linear-to-r from-violet-400 to-cyan-300 bg-clip-text text-transparent">
        Ninja
      </span>
    </span>
  );
}

/** Data-URI version of the mark, used as the favicon (no route needed). */
export const BRAND_FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8B5CF6"/><stop offset=".55" stop-color="#6366F1"/><stop offset="1" stop-color="#22D3EE"/></linearGradient><clipPath id="c"><path d="M16 1.5 28.6 8.75v14.5L16 30.5 3.4 23.25V8.75L16 1.5Z"/></clipPath></defs><path d="M16 1.5 28.6 8.75v14.5L16 30.5 3.4 23.25V8.75L16 1.5Z" fill="url(#g)"/><g clip-path="url(#c)"><path d="M0 12.2 32 11v8.2L0 20.4z" fill="#0B0B1A" fill-opacity=".92"/></g><path d="M7.6 14.3 14.3 15.9 13.5 17.9 8.6 16.9Z" fill="#E0F7FF"/><path d="M24.4 14.3 17.7 15.9 18.5 17.9 23.4 16.9Z" fill="#E0F7FF"/></svg>`
  );
