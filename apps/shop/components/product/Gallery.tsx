"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { PackFallback } from "@/components/catalog/PackVisual";
import { Icon } from "@/components/ui/Icon";
import type { Img } from "@/lib/catalog-map";
import { cx } from "@/lib/cx";
import { coverVars } from "@/lib/focus";
import { Lightbox } from "./Lightbox";

export interface GalleryProps {
  images: Img[];
  name: string;
  /** Product names, shown by the branded visual when the pack has no photo yet. */
  items?: string[];
}

const arrow =
  "absolute top-1/2 z-2 hidden size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-pill bg-surface-raised text-ink shadow-card hover:bg-surface-sunken disabled:hidden lg:grid";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * Product gallery: one scroll-snap track for every viewport (so the LCP photo exists once).
 * Mobile: full-width swipe with dots + counter. Desktop: arrows + thumbnails. A tap / click
 * opens the full-screen Lightbox.
 */
export function Gallery({ images, name, items }: GalleryProps) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const count = images.length;

  const goTo = useCallback((i: number, smooth = true) => {
    const el = track.current;
    if (!el) return;
    const next = Math.min(Math.max(i, 0), count - 1);
    const left = next * el.clientWidth;
    if (typeof el.scrollTo === "function") el.scrollTo({ left, behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto" });
    else el.scrollLeft = left;
    setIndex(next);
  }, [count]);

  useEffect(() => {
    const el = track.current;
    if (!el || count < 2) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
    };
  }, [count]);

  if (count === 0) {
    return (
      <div className="relative -mx-4 aspect-4/3 overflow-hidden sm:mx-0 sm:rounded-lg lg:aspect-16/11">
        <PackFallback name={name} items={items} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" role="region" aria-roledescription="galerie" aria-label={`Photos : ${name}`}>
      <div className="relative -mx-4 sm:mx-0">
        <div
          ref={track}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-surface-sunken [scrollbar-width:none] sm:rounded-lg [&::-webkit-scrollbar]:hidden"
          data-testid="gallery-track"
        >
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              className="relative aspect-4/3 w-full flex-none cursor-zoom-in snap-center snap-always lg:aspect-16/11"
              aria-label={`Agrandir la photo ${i + 1} sur ${count} : ${img.alt}`}
              onClick={() => {
                setIndex(i);
                setLightbox(true);
              }}
            >
              <Image
                src={img.src}
                alt=""
                fill
                sizes="(min-width: 1240px) 820px, (min-width: 1024px) 66vw, 134vw"
                quality={85}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                className={cx("object-cover", img.focus && "object-focus")}
                style={img.focus ? coverVars(img.focus, img, 4 / 3, 16 / 11) : undefined}
              />
            </button>
          ))}
        </div>

        <span className="pointer-events-none absolute bottom-3 left-3 inline-flex h-8 items-center gap-1.5 rounded-pill bg-ink/80 px-3 text-meta text-ink-inverse">
          <Icon name="expand" size={14} />
          {count > 1 ? (
            <span aria-live="polite">
              {index + 1} / {count}
            </span>
          ) : (
            "Zoom"
          )}
        </span>

        {count > 1 ? (
          <>
            <button type="button" className={cx(arrow, "left-4")} aria-label="Photo précédente" disabled={index === 0} onClick={() => goTo(index - 1)}>
              <Icon name="chevronLeft" size={24} />
            </button>
            <button type="button" className={cx(arrow, "right-4")} aria-label="Photo suivante" disabled={index === count - 1} onClick={() => goTo(index + 1)}>
              <Icon name="chevronRight" size={24} />
            </button>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <>
          {/* Mobile dots (each is a 44px target). */}
          <div className="flex justify-center lg:hidden" role="group" aria-label="Choisir une photo">
            {images.map((img, i) => (
              <button
                key={img.src}
                type="button"
                className="grid size-11 cursor-pointer place-items-center"
                aria-label={`Photo ${i + 1} sur ${count}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => goTo(i)}
              >
                <span className={cx("block h-2 rounded-pill transition-all duration-200", i === index ? "w-6 bg-ink" : "w-2 bg-line-strong")} />
              </button>
            ))}
          </div>
          {/* Desktop thumbnails. */}
          <div className="hidden gap-3 lg:flex" role="group" aria-label="Choisir une photo">
            {images.map((img, i) => (
              <button
                key={img.src}
                type="button"
                className={cx(
                  "relative aspect-4/3 w-24 cursor-pointer overflow-hidden rounded-md bg-surface-sunken transition-opacity",
                  i === index ? "ring-inset-strong-2 outline-2 outline-offset-2 outline-ink" : "opacity-70 hover:opacity-100",
                )}
                aria-label={`Photo ${i + 1} sur ${count}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => goTo(i)}
              >
                <Image src={img.src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            ))}
          </div>
        </>
      ) : null}

      <Lightbox
        images={images}
        index={index}
        open={lightbox}
        title={name}
        onClose={() => setLightbox(false)}
        onIndexChange={(i) => {
          setIndex(i);
          goTo(i, false);
        }}
      />
    </div>
  );
}
