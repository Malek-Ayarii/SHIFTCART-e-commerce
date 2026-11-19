"use client";

import { useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export interface StoryVideoProps {
  /** Short MP4 (≤ 15 s, ≤ 1.5 MB). Without it a striped placeholder is shown. */
  src?: string;
  /** Light WebP poster, essential on 3G. */
  poster?: string;
  caption?: string;
  author?: string;
  handle?: string;
  /** Active story bar. */
  index?: number;
  className?: string;
}

/** UGC slot in Instagram Story format (9:16). Nothing is downloaded before the tap (preload="none"). */
export function StoryVideo({
  src,
  poster,
  caption = "Pourquoi j'ai arrêté de jeter 120 DT/mois",
  author = "SC",
  handle = "@nexoshift.tn",
  index = 0,
  className,
}: StoryVideoProps) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const initials = author
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function toggle() {
    const v = ref.current;
    if (!v) {
      setPlaying((p) => !p);
      return;
    }
    if (v.paused) {
      void v.play().catch(() => setPlaying(false));
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  return (
    <figure
      className={cx(
        "group relative m-0 aspect-9/16 max-h-140 w-full overflow-hidden rounded-lg bg-ink text-ink-inverse",
        playing && "is-playing",
        className,
      )}
    >
      <div className="absolute inset-x-3 top-3 z-2 flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cx(
              "h-[3px] flex-1 overflow-hidden rounded-pill",
              i < index ? "bg-ink-inverse" : "bg-ink-inverse/35",
            )}
          >
            {i === index ? <span className="block h-full w-[45%] bg-ink-inverse" /> : null}
          </span>
        ))}
      </div>
      <div className="absolute inset-x-3 top-7 z-2 flex items-center gap-2 text-sm font-bold">
        <span className="grid size-8 place-items-center rounded-pill bg-orange text-xs font-extrabold text-on-orange shadow-avatar" aria-hidden="true">
          {initials}
        </span>
        <span>{handle}</span>
        <span className="ml-auto rounded-pill bg-ink-inverse/16 px-2 py-0.5 text-micro tracking-[0.08em]">UGC</span>
      </div>
      {src ? (
        <video
          ref={ref}
          className="absolute inset-0 size-full object-cover"
          src={src}
          poster={poster}
          muted
          playsInline
          loop
          preload="none"
          onEnded={() => setPlaying(false)}
        />
      ) : (
        <div className="absolute inset-0 grid size-full place-items-center story-stripes">
          <span className="mt-30 text-label uppercase opacity-70">Vidéo UGC · 9:16</span>
        </div>
      )}
      <button
        type="button"
        className={cx(
          "absolute top-1/2 left-1/2 z-2 grid size-18 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-pill bg-orange text-on-orange shadow-play",
          playing && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
        aria-label={playing ? "Mettre la vidéo en pause" : "Lire la vidéo"}
        onClick={toggle}
      >
        <Icon name={playing ? "pause" : "play"} size={28} />
      </button>
      <figcaption className="absolute inset-x-0 bottom-0 z-2 px-4 pt-12 pb-4 text-story text-ink-inverse story-fade">{caption}</figcaption>
    </figure>
  );
}
