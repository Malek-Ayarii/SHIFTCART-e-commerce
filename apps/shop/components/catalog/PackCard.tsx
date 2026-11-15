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
 * Collection card: 4:3 photo (zoom on hover), badge, name, promise, audience, then a price bar where
 * the amount is the hero and an orange arrow button invites the tap. The whole card is one link
 * (the title carries the accessible name); it lifts on hover and on keyboard focus.
 */
export function PackCard({ pack, headingLevel = 3, sizes = "(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 104vw", className }: PackCardProps) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article
      className={cx(
        "group relative flex flex-col overflow-hidden rounded-lg bg-surface-raised shadow-card ring-inset-line",
        "transition-[transform,box-shadow] duration-300 ease-sc hover:-translate-y-1.5 hover:shadow-hover focus-within:-translate-y-1.5 focus-within:shadow-hover",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-within:translate-y-0",
        className,
      )}
    >
      <div className="relative">
        <PackVisual
          image={pack.cover}
          name={pack.name}
          sizes={sizes}
          frameRatio={4 / 3}
          className="aspect-4/3"
          imageClassName="transition-transform duration-700 ease-sc group-hover:scale-106 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {/* Soft fade so the badge and price chip read on any photo. */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-ink/25 to-transparent" aria-hidden="true" />
        {pack.badge ? (
          <span className="absolute top-3 left-3 inline-flex h-7 items-center gap-1 rounded-pill bg-orange px-3 text-xs font-bold text-on-orange shadow-card">
            <Icon name="star" size={13} />
            {pack.badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5 lg:p-6">
        <H className="text-xl leading-7 font-bold tracking-tight">
          <Link href={packHref(pack.slug)} className="text-ink no-underline outline-none after:absolute after:inset-0 after:z-10 after:rounded-lg after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus-ring">
            {pack.name}
          </Link>
        </H>
        <p className="text-body-md text-ink-muted">{pack.tagline}</p>
        {pack.audience ? (
          <p className="flex items-start gap-2 text-small text-ink-muted">
            <Icon name="users" size={15} className="mt-0.5" />
            <span className="line-clamp-2">{pack.audience}</span>
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <div className="flex flex-col">
            <span className="flex items-start gap-1 text-ink">
              <span className="font-display text-4xl leading-none font-extrabold tracking-[-0.045em] tabular-nums">{formatAmount(pack.priceTnd)}</span>
              <span className="mt-0.5 text-sm font-bold">TND</span>
            </span>
            <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
              <Icon name="banknote" size={13} className="text-success" />
              Payé à la livraison
            </span>
          </div>
          <span
            className="grid size-12 flex-none place-items-center rounded-pill bg-ink text-ink-inverse transition-[transform,background-color,color] duration-300 ease-sc group-hover:bg-orange group-hover:text-on-orange group-hover:-rotate-45 motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
            aria-hidden="true"
          >
            <Icon name="arrowRight" size={20} />
          </span>
        </div>
      </div>
    </article>
  );
}
