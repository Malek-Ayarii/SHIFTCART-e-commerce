import Image from "next/image";
import Link from "next/link";
import { PackFallback } from "@/components/catalog/PackVisual";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mediaSrc, packHref } from "@/lib/catalog-map";
import { cx } from "@/lib/cx";
import { trackingAside, trackingGrid, trackingMain } from "./layout";
import { formatEta, formatStepDate } from "@/lib/format";
import { toUiStatus, type ApiOrderStatus, type TrackingResponse, type TrackingStep } from "@/lib/types";
import { confirmOrderUrl, SHOP_PHONE_DISPLAY } from "@/lib/whatsapp";

const TITLES: Record<ApiOrderStatus, string> = {
  NEW: "On attend ta confirmation",
  PENDING: "On attend ta confirmation",
  CONFIRMED: "Ton pack se prépare",
  SHIPPED: "Ton pack est en route",
  DELIVERED: "Ton pack est livré",
  RETURNED: "Ta commande est revenue chez nous",
  CANCELLED: "Ta commande est annulée",
};

const STEP_ICONS: Record<string, IconName> = {
  RECEIVED: "package",
  CONFIRMED: "whatsapp",
  SHIPPED: "truck",
  DELIVERED: "banknote",
};

/** What the step means, shown when the API gives no date or detail. */
const STEP_HINTS: Record<string, string> = {
  RECEIVED: "On a bien reçu ta commande",
  CONFIRMED: "Réponds OUI à notre message WhatsApp",
  SHIPPED: "Ton colis est confié au livreur",
  DELIVERED: "Le livreur t'appelle avant de passer",
};

function stepMeta(step: TrackingStep): string {
  const parts = [step.at ? formatStepDate(step.at) : "", step.detail ?? ""].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  if (step.state === "cancelled") return "";
  return STEP_HINTS[step.key] ?? "";
}

function StepDot({ step }: { step: TrackingStep }) {
  const base = "relative grid size-10 flex-none place-items-center rounded-pill";
  switch (step.state) {
    case "done":
      return (
        <span className={cx(base, "bg-success text-on-success")}>
          <Icon name="check" size={18} strokeWidth={3} />
        </span>
      );
    case "current":
      return (
        <span className={cx(base, "bg-orange text-on-orange")}>
          <span className="absolute inset-0 animate-ping-soft rounded-pill bg-orange motion-reduce:hidden" aria-hidden="true" />
          <Icon name={STEP_ICONS[step.key] ?? "clock"} size={18} className="relative" />
        </span>
      );
    case "cancelled":
      return (
        <span className={cx(base, "bg-danger-soft text-danger")}>
          <Icon name="x" size={18} strokeWidth={3} />
        </span>
      );
    default:
      return (
        <span className={cx(base, "bg-surface-sunken text-ink-muted")}>
          <Icon name={STEP_ICONS[step.key] ?? "clock"} size={18} />
        </span>
      );
  }
}

const STATE_LABEL: Record<TrackingStep["state"], string> = {
  done: "terminée",
  current: "en cours",
  upcoming: "à venir",
  cancelled: "annulée",
};

export function TrackingView({
  tracking,
  contactHref,
  now,
  coverPosition,
}: {
  tracking: TrackingResponse;
  contactHref: string;
  now?: Date;
  /** object-position keeping the pack's products in the thumbnail (lib/focus.ts). */
  coverPosition?: string | null;
}) {
  const status = tracking.status;
  const showCash = status !== "DELIVERED" && status !== "CANCELLED" && status !== "RETURNED";
  const awaiting = status === "NEW" || status === "PENDING";
  const confirmHref = awaiting ? confirmOrderUrl(tracking.ref) : null;
  const total = tracking.steps.length || 1;
  const done = tracking.steps.filter((s) => s.state === "done").length;
  const hasCurrent = tracking.steps.some((s) => s.state === "current");
  const progress = status === "DELIVERED" ? 100 : Math.round(((done + (hasCurrent ? 0.5 : 0)) / total) * 100);
  const stopped = status === "CANCELLED" || status === "RETURNED";

  return (
    <div className={trackingGrid}>
      <div className={trackingMain}>
        {/* Status hero */}
        <section className="relative overflow-hidden rounded-lg bg-ink p-5 text-ink-inverse enter lg:p-8">
          <span className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-pill bg-orange/30 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 text-label uppercase opacity-70">Commande #{tracking.ref}</p>
              <StatusBadge status={toUiStatus(status)} />
            </div>
            <h1 className="m-0 text-display-lg text-balance lg:text-display-xl">{TITLES[status] ?? TITLES.NEW}</h1>
            <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium opacity-80">
              {tracking.eta && !stopped && status !== "DELIVERED" ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="calendar" size={15} />
                  Arrivée prévue {formatEta(tracking.eta, now)}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Icon name="pin" size={15} />
                Livraison à {tracking.governorate}
              </span>
            </p>
            {!stopped ? (
              <div className="mt-1 flex items-center gap-3" aria-hidden="true">
                <span className="h-2 flex-1 overflow-hidden rounded-pill bg-ink-inverse/15">
                  <span className="block h-full origin-left rounded-pill bg-orange transition-[width] duration-700 ease-sc" style={{ width: `${progress}%` }} />
                </span>
                <span className="text-xs font-bold tabular-nums">{progress}%</span>
              </div>
            ) : null}
          </div>
        </section>

        {/* Confirm now: the one action that moves a NEW order forward. */}
        {confirmHref ? (
          <section className="flex flex-col gap-3 rounded-lg bg-surface-raised p-4 shadow-card ring-2 ring-whatsapp enter" style={{ ["--d" as string]: "80ms" }}>
            <div className="flex items-start gap-3">
              <span className="grid size-11 flex-none place-items-center rounded-md bg-whatsapp text-on-whatsapp">
                <Icon name="whatsapp" size={24} />
              </span>
              <div className="flex flex-col">
                <p className="m-0 text-title">Confirme ta commande</p>
                <p className="m-0 text-small text-ink-muted">Envoie-nous « OUI » sur WhatsApp : on prépare ton colis dès ta réponse.</p>
              </div>
            </div>
            <Button variant="whatsapp" size="md" block icon="whatsapp" href={confirmHref} target="_blank" className="h-13 text-base">
              Confirmer sur WhatsApp
            </Button>
          </section>
        ) : null}

        <PackRow tracking={tracking} coverPosition={coverPosition} />

        <section className="rounded-lg bg-surface-raised p-5 shadow-card ring-inset-line enter" style={{ ["--d" as string]: "160ms" }}>
          <h2 className="m-0 mb-4 text-label text-ink-muted uppercase">Suivi de ta commande</h2>
          <ol className="m-0 flex list-none flex-col p-0" aria-label="Étapes de la commande">
            {tracking.steps.map((step, i) => {
              const last = i === tracking.steps.length - 1;
              const meta = stepMeta(step);
              return (
                <li key={step.key} className="flex gap-4" aria-current={step.state === "current" ? "step" : undefined}>
                  <div className="flex flex-col items-center">
                    <StepDot step={step} />
                    {!last ? (
                      <span className="relative my-1 min-h-6 w-0.5 flex-1 overflow-hidden rounded-pill bg-line">
                        {step.state === "done" ? <span className="absolute inset-0 bg-success" /> : null}
                      </span>
                    ) : null}
                  </div>
                  <div className={cx("flex min-w-0 flex-col justify-center pt-2", !last && "pb-5")}>
                    <p
                      className={cx(
                        "m-0 text-base leading-6",
                        step.state === "current" ? "font-bold text-ink" : "font-semibold",
                        step.state === "upcoming" && "text-ink-muted",
                        step.state === "cancelled" && "text-danger",
                      )}
                    >
                      {step.label}
                      <span className="sr-only"> ({STATE_LABEL[step.state]})</span>
                      {step.state === "current" ? (
                        <span className="ml-2 inline-flex h-5 items-center rounded-pill bg-orange-soft px-2 align-middle text-micro text-orange-ink uppercase">En cours</span>
                      ) : null}
                    </p>
                    {meta ? <p className="m-0 text-small text-ink-muted">{meta}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <div className={trackingAside}>
        {showCash ? (
          <section className="flex items-center gap-4 rounded-lg bg-surface-raised p-4 shadow-card ring-inset-line enter" style={{ ["--d" as string]: "220ms" }}>
            <span className="grid size-12 flex-none place-items-center rounded-md bg-success-soft text-success">
              <Icon name="banknote" size={24} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-label text-ink-muted uppercase">Prépare en espèces</span>
              <span className="font-display text-3xl leading-9 font-extrabold tracking-tight tabular-nums">
                {tracking.amountTnd}
                <span className="ml-1 text-base font-bold">TND</span>
              </span>
            </div>
            <span className="hidden text-right text-xs leading-4 text-ink-muted min-[380px]:block">
              À remettre
              <br />
              au livreur
            </span>
          </section>
        ) : null}

        <HelpCard contactHref={contactHref} className="mt-auto lg:mt-0" />
      </div>
    </div>
  );
}

/** WhatsApp help: the brand-green button people recognise, with the number spelled out. */
export function HelpCard({ contactHref, className }: { contactHref: string; className?: string }) {
  const whatsapp = contactHref.startsWith("http");
  return (
    <section className={cx("flex flex-col gap-3 rounded-lg bg-surface-sunken p-4", className)}>
      <div className="flex items-center gap-3">
        <span className="relative grid size-11 flex-none place-items-center rounded-pill bg-whatsapp text-on-whatsapp">
          <Icon name="whatsapp" size={22} />
          <span className="absolute -top-0.5 -right-0.5 size-3 rounded-pill bg-success ring-2 ring-surface-sunken" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <p className="m-0 text-title">Une question sur ta commande ?</p>
          <p className="m-0 text-small text-ink-muted">On répond vite sur WhatsApp{whatsapp ? ` · ${SHOP_PHONE_DISPLAY}` : ""}</p>
        </div>
      </div>
      <Button
        variant={whatsapp ? "whatsapp" : "ghost"}
        size="md"
        block
        icon="whatsapp"
        iconRight={whatsapp ? "arrowRight" : undefined}
        href={contactHref}
        target={whatsapp ? "_blank" : undefined}
        className="h-13 text-base"
      >
        Écris-nous sur WhatsApp
      </Button>
    </section>
  );
}

export function TrackingProblem({ title, text, contactHref }: { title: string; text: string; contactHref: string }) {
  return (
    <div className={trackingGrid}>
      <div className={trackingMain}>
        <section className="flex flex-col gap-3 rounded-lg bg-surface-raised p-5 shadow-card ring-inset-line enter lg:p-8">
          <span className="grid size-12 place-items-center rounded-md bg-warning-soft text-warning">
            <Icon name="alert" size={24} />
          </span>
          <h1 className="m-0 text-display-lg lg:text-display-xl">{title}</h1>
          <p className="m-0 max-w-measure text-body text-ink-muted">{text}</p>
        </section>
      </div>
      <div className={trackingAside}>
        <div className="mt-auto flex flex-col gap-3 lg:mt-0">
          <HelpCard contactHref={contactHref} />
          <Button variant="ghost" size="md" block icon="home" href="/">
            Revenir à la boutique
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Ordered pack: thumbnail + name (never the address: docs/CONTRACT.md › v2). */
function PackRow({ tracking, coverPosition }: { tracking: TrackingResponse; coverPosition?: string | null }) {
  const cover = mediaSrc(tracking.productCoverUrl);
  const slug = tracking.productSlug && /^[a-z0-9-]{1,100}$/.test(tracking.productSlug) ? tracking.productSlug : null;
  return (
    <div className="flex items-center gap-4 rounded-lg bg-surface-raised p-3 shadow-card ring-inset-line enter" style={{ ["--d" as string]: "120ms" }} data-testid="tracking-pack">
      <span className="relative aspect-4/3 w-24 flex-none overflow-hidden rounded-md bg-surface-sunken">
        {cover ? (
          <Image src={cover} alt="" fill sizes="96px" className="object-cover" style={coverPosition ? { objectPosition: coverPosition } : undefined} />
        ) : (
          <PackFallback name={tracking.productName} compact />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {slug ? (
          <Link href={packHref(slug)} className="text-item text-ink no-underline underline-offset-4 hover:underline">
            {tracking.productName}
          </Link>
        ) : (
          <span className="text-item">{tracking.productName}</span>
        )}
        <span className="text-meta text-ink-muted">1 pack · paiement à la livraison</span>
      </div>
      <span className="pr-2 font-display text-lg font-extrabold tracking-tight whitespace-nowrap tabular-nums">{tracking.amountTnd} TND</span>
    </div>
  );
}
