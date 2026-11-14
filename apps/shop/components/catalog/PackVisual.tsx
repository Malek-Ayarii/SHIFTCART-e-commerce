import Image from "next/image";
import { Wordmark } from "@/components/ui/Wordmark";
import type { Img } from "@/lib/catalog-map";
import { cx } from "@/lib/cx";
import { coverVars } from "@/lib/focus";

export interface PackVisualProps {
  image: Img | null;
  /** Pack name, used by the branded fallback (never a broken image). */
  name: string;
  /** next/image `sizes` (the frame is always `fill`). */
  sizes: string;
  /** LCP image: eager + high fetch priority (no lazy loading). */
  eager?: boolean;
  className?: string;
  imageClassName?: string;
  quality?: number;
  /** Small thumbnail: the fallback shows the brand mark only. */
  compact?: boolean;
  /**
   * Frame ratio (w / h), or [mobile, lg] when it changes at `lg`: the crop then keeps the pack's
   * products (cover `focus`) in view instead of the photo centre.
   */
  frameRatio?: number | readonly [number, number];
}

/**
 * Pack photo in a sized frame (the parent sets the aspect ratio), with a sunken background while
 * it loads. Packs without a photo get a branded visual: ink, orange stripes, the name in Syne.
 */
export function PackVisual({ image, name, sizes, eager, className, imageClassName, quality, compact, frameRatio }: PackVisualProps) {
  const ratios = typeof frameRatio === "number" ? ([frameRatio, frameRatio] as const) : frameRatio;
  const focused = image?.focus && ratios ? coverVars(image.focus, image, ratios[0], ratios[1]) : undefined;
  return (
    <div className={cx("relative overflow-hidden bg-surface-sunken", className)}>
      {image ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          loading={eager ? "eager" : undefined}
          fetchPriority={eager ? "high" : undefined}
          quality={quality}
          className={cx("object-cover", focused && "object-focus", imageClassName)}
          style={focused}
        />
      ) : (
        <PackFallback name={name} compact={compact} />
      )}
    </div>
  );
}

export function PackFallback({ name, compact, items }: { name: string; compact?: boolean; /** Product names, listed when the frame is large (pack page). */ items?: string[] }) {
  const short = name.replace(/^(le|la|les)\s+pack\s+/i, "").trim() || name;
  if (compact) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-ink story-stripes" role="img" aria-label={`${name} : visuel SHIFT CART`} data-testid="pack-fallback">
        <span className="grid size-[60%] max-h-10 max-w-10 place-items-center rounded-pill bg-surface-raised" aria-hidden="true">
          <Wordmark src="mark" height={24} decorative className="max-h-[75%] w-auto" />
        </span>
      </div>
    );
  }
  return (
    <div
      className="@container absolute inset-0 flex flex-col justify-between bg-ink p-[8%] text-ink-inverse story-stripes"
      role="img"
      aria-label={`${name} : visuel SHIFT CART en attendant la photo`}
      data-testid="pack-fallback"
    >
      <span className="grid size-10 place-items-center rounded-pill bg-surface-raised" aria-hidden="true">
        <Wordmark src="mark" height={28} decorative />
      </span>
      {/* Sized by the frame (container query) so a long word (« PRODUCTIVITÉ », ~14em in Syne caps)
          fits whole inside the 84% content box, never clipped nor hyphenated. */}
      <div className="flex flex-col gap-3" aria-hidden="true">
        <span className="text-heading uppercase text-balance hyphens-manual @lg:text-display-lg @xl:text-kpi">{short}</span>
        {/* No photo yet: name what is inside rather than leaving a blank tile. */}
        {items && items.length > 0 ? (
          <ul className="m-0 hidden list-none flex-col gap-1 p-0 text-body-sm opacity-80 @md:flex">
            {items.map((it) => (
              <li key={it} className="flex items-center gap-2">
                <span className="size-1.5 flex-none rounded-pill bg-orange" />
                {it}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
