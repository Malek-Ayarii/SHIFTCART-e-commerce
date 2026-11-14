import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { packHref, type Pack } from "@/lib/catalog-map";
import { cx } from "@/lib/cx";
import { formatAmount } from "@/lib/format";
import { PackVisual } from "./PackVisual";

export interface PackCardProps {
  pack: Pick<Pack, "slug" | "name" | "badge" | "tagline" | "audience" | "priceTnd" | "cover">;
  /** Heading level inside the collection (h3 under the section h2). */
  headingLevel?: 2 | 3;
  sizes?: string;
  className?: string;
}

/**
 * Collection card: 16:10 photo (soft zoom on hover), badge, name, promise, audience, price and
 * « Découvrir le pack ». The whole card is one link (the title carries the accessible name).
 */
export function PackCard({ pack, headingLevel = 3, sizes = "(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 104vw", className }: PackCardProps) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className={cx("group relative flex flex-col overflow-hidden rounded-lg bg-surface-raised shadow-card ring-inset-line", className)}>
      <div className="relative">
        <PackVisual
          image={pack.cover}
          name={pack.name}
          sizes={sizes}
          frameRatio={16 / 10}
          className="aspect-16/10"
          imageClassName="transition-transform duration-500 ease-sc group-hover:scale-104 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {pack.badge ? (
          <span className="absolute top-3 left-3 inline-flex h-7 items-center gap-1 rounded-pill bg-surface-raised px-3 text-meta text-ink shadow-card">
            <Icon name="star" size={14} className="text-orange-ink" />
            {pack.badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5 lg:p-6">
        <H className="text-display-lg">
          <Link href={packHref(pack.slug)} className="text-ink no-underline after:absolute after:inset-0 after:content-['']">
            {pack.name}
          </Link>
        </H>
        <p className="text-body text-ink-muted">{pack.tagline}</p>
        {pack.audience ? (
          <p className="flex items-start gap-2 text-small text-ink-muted">
            <Icon name="users" size={16} className="mt-px" />
            <span className="line-clamp-2">{pack.audience}</span>
          </p>
        ) : null}
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
          <span className="text-price text-ink">
            {formatAmount(pack.priceTnd)}
            <span className="ml-1 text-lg">TND</span>
          </span>
          <span className="inline-flex min-h-11 items-center gap-1.5 text-body-md font-bold text-ink underline decoration-2 underline-offset-4 group-hover:text-orange-ink">
            Découvrir le pack
            <Icon name="chevronRight" size={18} />
          </span>
        </div>
      </div>
    </article>
  );
}
