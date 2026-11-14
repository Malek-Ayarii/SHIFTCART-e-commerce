/** Logo files copied from design/logos (never redrawn). Intrinsic sizes in px. */
export const LOGOS = {
  wordmark: { src: "/logos/shiftcart-wordmark.png", width: 1045, height: 124 },
  mark: { src: "/logos/shiftcart-mark.png", width: 394, height: 398 },
  logo: { src: "/logos/shiftcart-logo.png", width: 1045, height: 688 },
} as const;
export type LogoName = keyof typeof LOGOS;
