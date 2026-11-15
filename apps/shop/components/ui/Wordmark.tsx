import Image from "next/image";
import { cx } from "@/lib/cx";
import { BRAND_NAME, LOGOS, type LogoName } from "@/lib/logos";

export interface WordmarkProps {
  className?: string;
  /** Logo file (design/logos); without it the name is set in text as a fallback. */
  src?: LogoName;
  /** Height in px (32 by default). */
  height?: number;
  /** Fallback text on an ink background. */
  onDark?: boolean;
  priority?: boolean;
  /** Empty alt when a sibling already names the brand. */
  decorative?: boolean;
}

export function Wordmark({ className, src, height = 32, onDark, priority, decorative }: WordmarkProps) {
  if (src) {
    const logo = LOGOS[src];
    const width = Math.round((height * logo.width) / logo.height);
    return (
      <Image
        src={logo.src}
        width={width}
        height={height}
        alt={decorative ? "" : BRAND_NAME}
        priority={priority}
        // Vector logo: served as is (no raster optimisation).
        unoptimized
        className={cx("block max-w-none", className)}
        style={{ height, width: "auto" }}
      />
    );
  }
  return (
    <span
      className={cx("whitespace-nowrap font-display text-xl font-extrabold leading-6 tracking-tight", onDark ? "text-ink-inverse" : "text-ink", className)}
      aria-label={BRAND_NAME}
      role="img"
    >
      NEXO<span className={onDark ? "text-orange" : "text-orange-ink"}>SHIFT</span>
    </span>
  );
}
