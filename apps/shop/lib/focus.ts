import type { CSSProperties } from "react";
import type { Hotspot } from "./catalog-map";

/**
 * Art direction for cropped pack photos. A pack photo is a wide desk scene; its products sit
 * where the admin placed the hotspots. When a frame crops the photo (4:3 gallery, 16:10 card,
 * square thumbnail), keep that product area in view instead of the photo's centre — otherwise
 * the Barista thermos (x ≈ 88 %) falls off the right edge.
 */

/** Area (in % of the photo) that holds the pack's products. */
export interface FocusBox {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Hotspots mark the centre of each product: pad them so the whole object stays visible. */
const PAD_X = 9;
const PAD_Y = 12;

export function focusFromHotspots(hotspots: Array<Hotspot | null | undefined>): FocusBox | null {
  const pts = hotspots.filter((h): h is Hotspot => !!h);
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  return {
    x0: clamp(Math.min(...xs) - PAD_X),
    x1: clamp(Math.max(...xs) + PAD_X),
    y0: clamp(Math.min(...ys) - PAD_Y),
    y1: clamp(Math.max(...ys) + PAD_Y),
  };
}

/**
 * CSS `object-position` that centres the focus box in a frame of `frameRatio` (w / h) showing an
 * `object-fit: cover` image of `imageRatio`. For a visible fraction v < 1 of an axis, the image
 * offset is p·(1 − v) (p = object-position %), so the box centre c lands mid-frame for
 * p = (c − v/2) / (1 − v), clamped to [0, 100]. No box → the default centre.
 */
export function coverPosition(focus: FocusBox | null | undefined, imageRatio: number, frameRatio: number): string {
  if (!focus || !(imageRatio > 0) || !(frameRatio > 0)) return "50% 50%";
  const axis = (lo: number, hi: number, visible: number) => {
    if (visible >= 0.999) return 50;
    const c = (lo + hi) / 200;
    const p = ((c - visible / 2) / (1 - visible)) * 100;
    return Math.round(Math.min(100, Math.max(0, p)));
  };
  const x = axis(focus.x0, focus.x1, Math.min(1, frameRatio / imageRatio));
  const y = axis(focus.y0, focus.y1, Math.min(1, imageRatio / frameRatio));
  return `${x}% ${y}%`;
}

/** Same, as a style for one fixed frame ratio. */
export function coverStyle(focus: FocusBox | null | undefined, image: { width: number; height: number }, frameRatio: number): CSSProperties {
  return { objectPosition: coverPosition(focus, image.width / image.height, frameRatio) };
}

/**
 * Responsive frames (a different ratio from `lg`): exposes both positions as CSS variables, read
 * by the `object-focus` utility in globals.css.
 */
export function coverVars(
  focus: FocusBox | null | undefined,
  image: { width: number; height: number },
  frameRatio: number,
  frameRatioLg: number,
): CSSProperties {
  const r = image.width / image.height;
  return { "--focus": coverPosition(focus, r, frameRatio), "--focus-lg": coverPosition(focus, r, frameRatioLg) } as CSSProperties;
}
