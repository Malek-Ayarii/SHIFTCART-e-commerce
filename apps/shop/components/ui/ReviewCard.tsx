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
    <figure className={cx("m-0 grid gap-2 rounded-md bg-surface-raised p-4 ring-inset-line", className)}>
      <div className="flex gap-0.5 text-orange-ink" role="img" aria-label={`${rating} sur 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Icon key={n} name="star" size={16} className={n > rating ? "opacity-25" : undefined} />
        ))}
      </div>
      <blockquote className="m-0 text-base font-semibold leading-6">« {text} »</blockquote>
      <figcaption className="flex items-center gap-2 text-sm leading-5 text-ink-muted">
        <strong className="text-ink">{name}</strong>
        <span>· {city}</span>
        {verified ? (
          <span className="ml-auto inline-flex items-center gap-0.5 text-meta text-success">
            <Icon name="check" size={14} />
            Achat vérifié
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
