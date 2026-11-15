import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export interface ReviewCardProps {
  name: string;
  city: string;
  text: string;
  rating?: number;
  /** Only when the review is tied to a delivered order. */
  verified?: boolean;
  className?: string;
}

export function ReviewCard({ name, city, text, rating = 5, verified, className }: ReviewCardProps) {
  return (
    <figure
      className={cx(
        "m-0 flex flex-col gap-4 rounded-lg bg-surface-raised p-5 shadow-card ring-inset-line transition-[transform,box-shadow] duration-300 ease-sc hover:-translate-y-1 hover:shadow-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:p-6",
        className,
      )}
    >
      <div className="flex gap-0.5 text-orange" role="img" aria-label={`${rating} sur 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Icon key={n} name="star" size={16} className={n > rating ? "opacity-25" : undefined} />
        ))}
      </div>
      <blockquote className="m-0 flex-1 text-lg leading-7 font-medium tracking-tight">« {text} »</blockquote>
      <figcaption className="flex items-center gap-3 border-t border-line pt-4 text-sm leading-5 text-ink-muted">
        <span className="grid size-9 flex-none place-items-center rounded-pill bg-orange-soft text-sm font-bold text-orange-ink" aria-hidden="true">
          {name.charAt(0)}
        </span>
        <span className="flex flex-col">
          <strong className="font-semibold text-ink">{name}</strong>
          <span>{city}</span>
        </span>
        {verified ? (
          <span className="ml-auto inline-flex items-center gap-1 text-meta text-success">
            <Icon name="badgeCheck" size={15} />
            Achat vérifié
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
