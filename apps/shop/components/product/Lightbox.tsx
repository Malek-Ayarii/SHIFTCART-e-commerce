"use client";

import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Img } from "@/lib/catalog-map";
import { cx } from "@/lib/cx";
import { useDialog } from "@/lib/use-dialog";

export interface LightboxProps {
  images: Img[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  title: string;
}

const SWIPE_PX = 50;
const ctrl =
  "grid size-12 flex-none cursor-pointer place-items-center rounded-pill bg-ink-inverse/12 text-ink-inverse hover:bg-ink-inverse/24 disabled:cursor-default disabled:opacity-30";

/**
 * Full-screen photo viewer: Escape closes, ← / → and swipe change photo, tap / click zooms ×2 on
 * the pointed area. Focus is trapped inside and returned to the opener (useDialog).
 */
export function Lightbox({ images, index, open, onClose, onIndexChange, title }: LightboxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  useDialog(open, ref, onClose, { initialFocus: "[data-autofocus]" });

  if (!open || images.length === 0) return null;
  const count = images.length;
  const i = Math.min(Math.max(index, 0), count - 1);
  const img = images[i];

  function go(next: number) {
    if (next < 0 || next >= count) return;
    setZoom(null);
    onIndexChange(next);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(i + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(i - 1);
    }
  }

  function onPointerDown(e: PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY };
    swiped.current = false;
  }
  function onPointerUp(e: PointerEvent) {
    const s = start.current;
    start.current = null;
    if (!s || zoom) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
      swiped.current = true;
      go(dx < 0 ? i + 1 : i - 1);
    }
  }
  function toggleZoom(e: MouseEvent<HTMLButtonElement>) {
    if (swiped.current) return;
    if (zoom) {
      setZoom(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    // Keyboard activation has no pointer position: zoom on the centre.
    const x = e.clientX ? ((e.clientX - r.left) / r.width) * 100 : 50;
    const y = e.clientY ? ((e.clientY - r.top) / r.height) * 100 : 50;
    setZoom({ x, y });
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-60 flex flex-col bg-ink text-ink-inverse"
      onKeyDown={onKeyDown}
      data-testid="lightbox"
    >
      <div className="flex items-center gap-3 px-3 py-2 sm:px-5">
        <h2 id={titleId} className="min-w-0 flex-1 truncate text-title">
          {title}
          {count > 1 ? (
            <span className="ml-2 font-semibold opacity-70" aria-live="polite">
              {i + 1} / {count}
            </span>
          ) : null}
        </h2>
        <button type="button" data-dialog-close data-autofocus className={ctrl} aria-label="Fermer la galerie" onClick={onClose}>
          <Icon name="x" size={24} />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-16">
        <button
          type="button"
          className={cx(
            "relative size-full touch-pan-y overflow-hidden rounded-md select-none",
            zoom ? "cursor-zoom-out" : "cursor-zoom-in",
          )}
          aria-label={zoom ? "Dézoomer la photo" : "Zoomer sur la photo"}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onClick={toggleZoom}
        >
          <Image
            key={img.src}
            src={img.src}
            alt={img.alt}
            fill
            sizes="100vw"
            quality={85}
            draggable={false}
            className="object-contain transition-transform duration-300 ease-sc motion-reduce:transition-none"
            style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        </button>
        {count > 1 ? (
          <>
            <button
              type="button"
              className={cx(ctrl, "absolute top-1/2 left-2 -translate-y-1/2 sm:left-4")}
              aria-label="Photo précédente"
              disabled={i === 0}
              onClick={() => go(i - 1)}
            >
              <Icon name="chevronLeft" size={26} />
            </button>
            <button
              type="button"
              className={cx(ctrl, "absolute top-1/2 right-2 -translate-y-1/2 sm:right-4")}
              aria-label="Photo suivante"
              disabled={i === count - 1}
              onClick={() => go(i + 1)}
            >
              <Icon name="chevronRight" size={26} />
            </button>
          </>
        ) : null}
      </div>
      <p className="pb-[calc(var(--space-4)+env(safe-area-inset-bottom,0px))] text-center text-small opacity-70">
        {/* Same gesture, named for the device: touch on phones, click with a mouse. */}
        <span className="pointer-fine:hidden">{count > 1 ? "Glisse · " : ""}Touche la photo pour zoomer</span>
        <span className="hidden pointer-fine:inline">{count > 1 ? "Flèches ← → · " : ""}Clique sur la photo pour zoomer</span>
      </p>
    </div>
  );
}
