"use client";

import { useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";

export const STEPS: Array<{ icon: IconName; title: string; text: string; short: string }> = [
  {
    icon: "tap",
    short: "Commande",
    title: "Commande en 30 secondes",
    text: "Nom, téléphone, gouvernorat et adresse. Pas de compte, pas de carte bancaire.",
  },
  {
    icon: "whatsapp",
    short: "Confirmation",
    title: "Confirme sur WhatsApp",
    text: "Un message arrive sur ton téléphone : réponds OUI, on prépare ton colis.",
  },
  {
    icon: "handCoins",
    short: "Livraison",
    title: "Paie à la livraison",
    text: "En espèces, au livreur, sous 24 à 48 h partout en Tunisie. Rien à payer avant.",
  },
];

const STEP_MS = 4500;

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** Reduced motion is assumed on the server: no auto-play until the client knows better. */
const useReducedMotion = () => useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED).matches, () => true);

/**
 * The 3 steps as an interactive stepper (WAI-ARIA tabs): click, tap or use the arrow keys; it also
 * advances on its own with a progress bar until the visitor takes over (never with reduced motion).
 * The panel previews what actually happens at each step.
 */
export function HowItWorksStepper({ example = { name: "Pack Barista", price: 89 } }: { example?: { name: string; price: number } }) {
  const [active, setActive] = useState(0);
  const [taken, setTaken] = useState(false);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const auto = !reduced && !taken;
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const uid = useId();

  const choose = (i: number, focus = false) => {
    // Any manual choice stops the auto-play for good.
    setTaken(true);
    setActive(i);
    if (focus) tabs.current[i]?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = STEPS.length;
    const map: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (e.key in map) {
      e.preventDefault();
      choose((active + map[e.key] + n) % n, true);
    } else if (e.key === "Home") {
      e.preventDefault();
      choose(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      choose(n - 1, true);
    }
  };

  return (
    <div
      className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div role="tablist" aria-label="Les 3 étapes" aria-orientation="vertical" className="flex flex-col gap-3" onKeyDown={onKey}>
        {STEPS.map((s, i) => {
          const on = i === active;
          const done = i < active;
          return (
            <button
              key={s.title}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${i}`}
              aria-selected={on}
              aria-controls={`${uid}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => choose(i)}
              className={cx(
                "group relative flex w-full cursor-pointer items-start gap-4 overflow-hidden rounded-lg p-4 text-left transition-[background-color,box-shadow,transform] duration-300 ease-sc lg:p-5",
                on ? "bg-surface-raised shadow-hover ring-2 ring-orange" : "bg-surface-raised/60 ring-inset-line hover:bg-surface-raised hover:shadow-card",
              )}
            >
              <span
                className={cx(
                  "grid size-12 flex-none place-items-center rounded-md transition-[background-color,color,transform] duration-300 ease-sc",
                  on ? "scale-105 bg-orange text-on-orange" : done ? "bg-success-soft text-success" : "bg-surface-sunken text-ink-muted group-hover:text-ink",
                )}
              >
                <Icon name={done ? "check" : s.icon} size={22} strokeWidth={done ? 2.75 : 2} />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className={cx("text-step-num uppercase", on ? "text-orange-ink" : "text-ink-muted")}>Étape {i + 1}</span>
                <span className="text-title text-ink">{s.title}</span>
                <span
                  className={cx(
                    "grid text-small text-ink-muted transition-[grid-template-rows,opacity] duration-300 ease-sc",
                    on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 lg:grid-rows-[1fr] lg:opacity-70",
                  )}
                >
                  <span className="overflow-hidden">{s.text}</span>
                </span>
              </span>
              {on && auto ? (
                <span className="absolute inset-x-0 bottom-0 h-1 bg-orange-soft" aria-hidden="true">
                  <span
                    key={active}
                    className="block h-full origin-left animate-progress bg-orange"
                    style={{ ["--step-ms" as string]: `${STEP_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
                    onAnimationEnd={() => setActive((a) => (a + 1) % STEPS.length)}
                  />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${uid}-panel`}
        aria-labelledby={`${uid}-tab-${active}`}
        className="relative grid min-h-80 place-items-center overflow-hidden rounded-lg bg-ink p-6 text-ink-inverse lg:min-h-full lg:p-10"
      >
        <span className="pointer-events-none absolute inset-0 story-stripes opacity-60" aria-hidden="true" />
        <span className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-pill bg-orange/25 blur-3xl" aria-hidden="true" />
        <div key={active} className="relative w-full max-w-90 animate-fade-up">
          {active === 0 ? <OrderPreview /> : active === 1 ? <WhatsAppPreview name={example.name} /> : <DeliveryPreview price={example.price} />}
        </div>
      </div>
    </div>
  );
}

const fieldRow = "flex items-center gap-3 rounded-md bg-surface-raised px-3 py-2.5 text-ink pop-in";

function OrderPreview() {
  const rows: Array<[IconName, string]> = [
    ["users", "Sarra Kefi"],
    ["phone", "+216 •• ••• 592"],
    ["pin", "Tunis · Lafayette"],
  ];
  return (
    <div className="flex flex-col gap-2.5" aria-hidden="true">
      <p className="mb-1 text-label uppercase opacity-70">Ta commande</p>
      {rows.map(([icon, label], i) => (
        <div key={label} className={fieldRow} style={{ ["--d" as string]: `${120 + i * 140}ms` }}>
          <Icon name={icon} size={18} className="text-ink-muted" />
          <span className="text-body-md font-medium">{label}</span>
          <Icon name="check" size={16} strokeWidth={3} className="ml-auto text-success" />
        </div>
      ))}
      <div className="mt-2 flex items-center justify-center gap-2 rounded-md bg-orange py-3 text-sm font-bold tracking-wide text-on-orange uppercase pop-in" style={{ ["--d" as string]: "620ms" }}>
        Confirmer ma commande
        <Icon name="tap" size={18} />
      </div>
      <p className="mt-1 text-center text-small opacity-70">Pas de compte · Pas de carte</p>
    </div>
  );
}

function WhatsAppPreview({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <div className="flex items-center gap-3 border-b border-ink-inverse/15 pb-3">
        <span className="grid size-10 place-items-center rounded-pill bg-whatsapp text-on-whatsapp">
          <Icon name="whatsapp" size={22} />
        </span>
        <span className="flex flex-col">
          <span className="text-title">NEXO SHIFT</span>
          <span className="text-xs opacity-70">en ligne</span>
        </span>
      </div>
      <p className="max-w-[85%] self-start rounded-md rounded-tl-none bg-surface-raised px-3.5 py-2.5 text-body-md text-ink pop-in" style={{ ["--d" as string]: "150ms" }}>
        Salut Sarra ! Ton {name} est prêt. Réponds <strong>OUI</strong> pour lancer la livraison 🚚
      </p>
      <p className="flex items-center gap-1.5 self-end rounded-md rounded-tr-none bg-whatsapp px-3.5 py-2.5 text-body-md font-semibold text-on-whatsapp pop-in" style={{ ["--d" as string]: "800ms" }}>
        OUI 🙌
        <Icon name="check" size={14} strokeWidth={3} />
      </p>
      <p className="self-start rounded-pill bg-ink-inverse/10 px-3 py-1 text-xs font-medium pop-in" style={{ ["--d" as string]: "1300ms" }}>
        ✅ Commande confirmée, on prépare ton colis
      </p>
    </div>
  );
}

function DeliveryPreview({ price }: { price: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="relative h-14 overflow-hidden rounded-md bg-ink-inverse/10">
        <span className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 bg-[repeating-linear-gradient(90deg,currentColor_0_8px,transparent_8px_16px)] opacity-30" />
        <span className="absolute top-1/2 left-4 grid size-10 -translate-y-1/2 place-items-center rounded-pill bg-orange text-on-orange motion-safe:animate-[drive_2.4s_var(--ease-sc)_both]">
          <Icon name="truck" size={20} />
        </span>
        <span className="absolute top-1/2 right-4 grid size-10 -translate-y-1/2 place-items-center rounded-pill bg-surface-raised text-ink">
          <Icon name="home" size={20} />
        </span>
      </div>
      <div className="flex items-center gap-3 rounded-md bg-surface-raised p-4 text-ink pop-in" style={{ ["--d" as string]: "900ms" }}>
        <span className="grid size-11 place-items-center rounded-sm bg-success-soft text-success">
          <Icon name="banknote" size={22} />
        </span>
        <span className="flex flex-col">
          <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">À la porte, en espèces</span>
          <span className="text-2xl font-extrabold tracking-tight tabular-nums">{price} TND</span>
        </span>
        <Icon name="badgeCheck" size={26} className="ml-auto text-success" />
      </div>
      <p className="text-center text-small opacity-70">Le livreur t&apos;appelle avant de passer · 24–48 h</p>
    </div>
  );
}
