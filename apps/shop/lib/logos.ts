/** Logo files copied from design/logos (never redrawn). Intrinsic sizes = SVG viewBox units. */
export const LOGOS = {
  /** Horizontal lockup: cube mark + NEXOSHIFT (headers). */
  wordmark: { src: "/logos/nexoshift-horizontal.svg", width: 436.1, height: 68.5 },
  /** Same lockup with white NEXO, for ink backgrounds. */
  wordmarkLight: { src: "/logos/nexoshift-horizontal-light.svg", width: 436.1, height: 68.5 },
  /** Cube mark alone. */
  mark: { src: "/logos/nexoshift-mark.svg", width: 126, height: 141 },
  /** Stacked logo (mark above the name). */
  logo: { src: "/logos/nexoshift-logo.svg", width: 360.077, height: 206.389 },
  logoLight: { src: "/logos/nexoshift-logo-light.svg", width: 360.077, height: 206.389 },
} as const;
export type LogoName = keyof typeof LOGOS;

export const BRAND_NAME = "NEXO SHIFT";
