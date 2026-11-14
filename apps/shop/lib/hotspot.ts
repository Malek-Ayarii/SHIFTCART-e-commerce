import type { CSSProperties } from "react";
import type { Hotspot } from "./catalog-map";

/**
 * Style that zooms a `fill` + `object-cover` image on a hotspot, inside a square frame, while
 * keeping the frame fully covered (no empty edge). object-position aligns the hotspot of the image
 * with the same % of the frame; the scale is anchored there, then the translation recentres it,
 * clamped so the scaled image always covers [0, 100] %.
 */
export function hotspotZoomStyle(h: Hotspot, scale = 2.4): CSSProperties {
  const axis = (p: number) => {
    const wanted = 50 - p;
    const min = 100 - p - (100 - p) * scale;
    const max = p * scale - p;
    return Math.round(Math.min(max, Math.max(min, wanted)) * 100) / 100;
  };
  return {
    objectPosition: `${h.x}% ${h.y}%`,
    transformOrigin: `${h.x}% ${h.y}%`,
    transform: `translate(${axis(h.x)}%, ${axis(h.y)}%) scale(${scale})`,
  };
}
