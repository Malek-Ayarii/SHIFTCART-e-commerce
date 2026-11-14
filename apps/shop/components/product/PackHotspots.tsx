"use client";

import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { chipClass } from "@/components/ui/PriceTag";
import type { Img, PackItem } from "@/lib/catalog-map";
import { cx } from "@/lib/cx";
import { hotspotZoomStyle } from "@/lib/hotspot";

export interface PackHotspotsProps {
  /** Main photo of the pack (pins are placed on it). */
  image: Img | null;
  name: string;
  items: PackItem[];
}

/**
 * « Qu'y a-t-il dans ton pack ? » — numbered pins on the main photo at each item's hotspot.
 * A pin (tap, hover, focus, ← / →) and its list row are synchronised; the card shows the item
 * photo, or the main photo zoomed on the hotspot. Items without a hotspot are listed only.
 */
export function PackHotspots({ image, name, items }: PackHotspotsProps) {
  const [active, setActive] = useState(0);
  const pins = useRef<Array<HTMLButtonElement | null>>([]);
  const cardId = useId();
  if (items.length === 0) return null;

  const current = items[Math.min(active, items.length - 1)];
  const pinned = items.map((it, i) => ({ it, i })).filter(({ it }) => it.hotspot && image);
  // Roving tabindex: one pin in the Tab order (the active one, else the first).
  const tabbable = pinned.some((p) => p.i === active) ? active : pinned[0]?.i;

  function onPinKey(e: KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const order = pinned.map((p) => p.i);
    const pos = order.indexOf(i);
    let next = pos;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = order.length - 1;
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (pos + 1) % order.length;
    else next = (pos - 1 + order.length) % order.length;
    const target = order[next];
    setActive(target);
    pins.current[target]?.focus();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Photo + pins: the frame keeps the photo's own ratio so the % positions match. */}
      {image ? (
        <div
          className="relative overflow-hidden rounded-lg bg-surface-sunken"
          style={{ aspectRatio: `${image.width} / ${image.height}` }}
        >
          <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1240px) 700px, (min-width: 1024px) 56vw, 100vw" className="object-cover" />
          {pinned.length > 0 ? (
            <div role="group" aria-label="Produits sur la photo (flèches pour passer de l'un à l'autre)">
              {pinned.map(({ it, i }) => {
                const on = i === active;
                return (
                  <button
                    key={it.id}
                    ref={(el) => {
                      pins.current[i] = el;
                    }}
                    type="button"
                    className="group absolute grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-pill"
                    style={{ left: `${it.hotspot!.x}%`, top: `${it.hotspot!.y}%` }}
                    aria-label={`${i + 1} : ${it.name}`}
                    aria-pressed={on}
                    aria-controls={cardId}
                    tabIndex={i === tabbable ? 0 : -1}
                    onClick={() => setActive(i)}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onKeyDown={(e) => onPinKey(e, i)}
                    data-testid="hotspot-pin"
                  >
                    {on ? <span className="absolute inset-0 animate-ping rounded-pill bg-orange/40 motion-reduce:hidden" aria-hidden="true" /> : null}
                    <span
                      className={cx(
                        "relative grid size-8 place-items-center rounded-pill text-meta font-extrabold shadow-lift ring-2 transition-transform duration-200 ease-sc motion-reduce:transition-none",
                        on ? "scale-115 bg-ink text-ink-inverse ring-orange" : "bg-surface-raised text-ink ring-surface-raised group-hover:scale-110",
                      )}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        {/* Active item card */}
        <article id={cardId} aria-live="polite" className="flex gap-4 rounded-lg bg-surface-raised p-4 shadow-card" data-testid="hotspot-card">
          <div className="relative size-24 flex-none overflow-hidden rounded-md bg-surface-sunken sm:size-28">
            {current.photo ? (
              <Image src={current.photo.src} alt={current.photo.alt} fill sizes="112px" className="object-cover" />
            ) : image && current.hotspot ? (
              <Image
                key={current.id}
                src={image.src}
                alt=""
                fill
                sizes="(min-width: 640px) 280px, 240px"
                className="object-cover"
                style={hotspotZoomStyle(current.hotspot)}
              />
            ) : (
              <span className="grid size-full place-items-center bg-orange-soft text-orange-ink">
                <Icon name={current.gift ? "gift" : "package"} size={32} />
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-label text-ink-muted">
                {active + 1} / {items.length}
              </span>
              {current.gift ? (
                <span className={cx(chipClass, "h-6 bg-orange-soft text-orange-ink")}>
                  <Icon name="gift" size={14} />
                  Offert
                </span>
              ) : null}
            </p>
            <h3 className="text-title text-pretty">
              {current.quantity > 1 ? `${current.quantity} × ` : ""}
              {current.name}
            </h3>
            {current.description ? <p className="text-body-sm text-ink-muted">{current.description}</p> : null}
          </div>
        </article>

        {/* Synced list */}
        <ol className="m-0 grid list-none gap-1.5 p-0" aria-label={`Contenu : ${name}`}>
          {items.map((it, i) => {
            const on = i === active;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  className={cx(
                    "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                    on ? "bg-surface-raised ring-inset-strong" : "hover:bg-surface-raised",
                  )}
                  aria-current={on ? "true" : undefined}
                  aria-controls={cardId}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                >
                  <span
                    className={cx(
                      "grid size-7 flex-none place-items-center rounded-pill text-meta font-extrabold",
                      on ? "bg-ink text-ink-inverse" : "bg-surface-sunken text-ink",
                    )}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-body-md font-bold text-pretty">{it.name}</span>
                  {it.gift ? <span className="text-meta text-orange-ink">Offert</span> : null}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
