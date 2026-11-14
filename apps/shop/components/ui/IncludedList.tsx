import { chipClass } from "./PriceTag";
import { Icon, type IconName } from "./Icon";

export interface IncludedItem {
  icon?: IconName;
  title: string;
  detail?: string;
  tag?: string;
}

export const DEFAULT_INCLUDED: IncludedItem[] = [
  { icon: "coffee", title: "Cafetière italienne Moka", detail: "6 tasses, compatible gaz et plaque" },
  { icon: "thermo", title: "Thermos intelligent LED", detail: "Affiche la température, garde chaud 12 h" },
  { icon: "gift", title: "Café tunisien offert", detail: "Un paquet moulu pour démarrer", tag: "Offert" },
];

export interface IncludedListProps {
  items?: IncludedItem[];
}

/** Swap the icon for a 48×48 WebP product photo once photos exist. */
export function IncludedList({ items = DEFAULT_INCLUDED }: IncludedListProps) {
  return (
    <ul className="m-0 grid list-none gap-3 p-0">
      {items.map((it) => (
        <li key={it.title} className="flex items-center gap-3 rounded-md bg-surface-raised p-3 ring-inset-line">
          <span className="grid size-12 flex-none place-items-center rounded-md bg-orange-soft text-orange-ink">
            <Icon name={it.icon ?? "package"} size={24} />
          </span>
          <div>
            <p className="m-0 text-title">{it.title}</p>
            {it.detail ? <p className="m-0 text-sm leading-5 text-ink-muted">{it.detail}</p> : null}
          </div>
          {it.tag ? <span className={`${chipClass} ml-auto self-start bg-orange-soft text-orange-ink`}>{it.tag}</span> : null}
        </li>
      ))}
    </ul>
  );
}
