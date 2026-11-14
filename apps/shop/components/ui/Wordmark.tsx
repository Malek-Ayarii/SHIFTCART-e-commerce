import Image from "next/image";
import { cx } from "@/lib/cx";
import { LOGOS, type LogoName } from "@/lib/logos";

export interface WordmarkProps {
  className?: string;
  /** Logo file (design/logos); without it the name is set in Syne as a fallback. */
  src?: LogoName;
  /** Height in px (32 by default). */
  height?: number;
  /** Fallback text on an ink background: word in ink-inverse, CART in orange. */
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
        alt={decorative ? "" : "SHIFT CART"}
        priority={priority}
        className={cx("block max-w-none", className)}
        style={{ height, width: "auto" }}
      />
    );
  }
  return (
    <span
      className={cx(
        "whitespace-nowrap font-display text-xl font-extrabold leading-6 tracking-[0.14em]",
        onDark ? "text-ink-inverse" : "text-ink",
        className,
      )}
      aria-label="SHIFT CART"
      role="img"
    >
      SHIFT<span className={cx("ml-[0.3em]", onDark ? "text-orange" : "text-orange-ink")}>CART</span>
    </span>
  );
}
