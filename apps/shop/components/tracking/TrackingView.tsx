import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cx } from "@/lib/cx";
import { formatEta, formatStepDate } from "@/lib/format";
import { toUiStatus, type ApiOrderStatus, type TrackingResponse, type TrackingStep } from "@/lib/types";

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

function stepMeta(step: TrackingStep): string {
  const parts = [step.at ? formatStepDate(step.at) : "", step.detail ?? ""].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  if (step.state === "upcoming" && step.key === "DELIVERED") return "Le livreur t'appelle avant de passer";
  return "";
}

function StepDot({ step }: { step: TrackingStep }) {
  const base = "grid size-7 flex-none place-items-center rounded-pill";
  switch (step.state) {
    case "done":
      return (
        <span className={cx(base, "bg-success text-on-success")}>
          <Icon name="check" size={16} strokeWidth={3} />
        </span>
      );
    case "current":
      return (
        <span className={cx(base, "bg-orange text-on-orange")}>
          <Icon name={STEP_ICONS[step.key] ?? "clock"} size={16} />
        </span>
      );
    case "cancelled":
      return (
        <span className={cx(base, "bg-danger-soft text-danger")}>
          <Icon name="x" size={16} strokeWidth={3} />
        </span>
      );
    default:
      return (
        <span className={cx(base, "text-ink-muted ring-inset-strong-2")}>
          <Icon name={STEP_ICONS[step.key] ?? "clock"} size={16} />
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

export function TrackingView({ tracking, contactHref, now }: { tracking: TrackingResponse; contactHref: string; now?: Date }) {
  const status = tracking.status;
  const etaText = tracking.eta ? `Arrivée prévue ${formatEta(tracking.eta, now)}, ${tracking.governorate}` : tracking.governorate;
  const showCash = status !== "DELIVERED" && status !== "CANCELLED" && status !== "RETURNED";
  const whatsapp = contactHref.startsWith("http");

  return (
    <>
      <section className="flex flex-col gap-2 px-4 pt-6 pb-4">
        <p className="m-0 text-label uppercase text-ink-muted">Commande #{tracking.ref}</p>
        <h1 className="m-0 text-display-lg">{TITLES[status] ?? TITLES.NEW}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={toUiStatus(status)} />
          <span className="text-sm font-semibold text-ink-muted">{etaText}</span>
        </div>
      </section>

      <ol className="mx-4 my-0 flex list-none flex-col rounded-lg bg-surface-raised px-4 py-5 shadow-card" aria-label="Étapes de la commande">
        {tracking.steps.map((step, i) => {
          const last = i === tracking.steps.length - 1;
          const meta = stepMeta(step);
          return (
            <li key={step.key} className="flex gap-3" aria-current={step.state === "current" ? "step" : undefined}>
              <div className="flex flex-col items-center">
                <StepDot step={step} />
                {!last ? <span className={cx("min-h-7 w-0.5 flex-1", step.state === "done" ? "bg-success" : "bg-line-strong")} /> : null}
              </div>
              <div className={cx(!last && "pb-4")}>
                <p
                  className={cx(
                    "m-0 text-base leading-6",
                    step.state === "current" ? "font-extrabold" : "font-bold",
                    step.state === "upcoming" && "text-ink-muted",
                    step.state === "cancelled" && "text-danger",
                  )}
                >
                  {step.label}
                  <span className="sr-only"> ({STATE_LABEL[step.state]})</span>
                </p>
                {meta ? <p className="m-0 text-small text-ink-muted">{meta}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>

      {showCash ? (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-md bg-ink p-4 text-ink-inverse">
          <span className="grid size-11 flex-none place-items-center rounded-sm bg-orange text-on-orange">
            <Icon name="banknote" size={22} />
          </span>
          <div className="flex flex-col">
            <span className="text-label uppercase opacity-80">Prépare en espèces</span>
            <span className="text-sheet-title">{tracking.amountTnd} TND</span>
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-3 p-4">
        <Button variant={whatsapp ? "whatsapp" : "ghost"} size="md" block icon="whatsapp" href={contactHref} target={whatsapp ? "_blank" : undefined}>
          Une question ? Écris-nous
        </Button>
      </div>
    </>
  );
}

export function TrackingProblem({ title, text, contactHref }: { title: string; text: string; contactHref: string }) {
  const whatsapp = contactHref.startsWith("http");
  return (
    <>
      <section className="flex flex-col gap-3 px-4 pt-6 pb-4">
        <span className="grid size-12 place-items-center rounded-pill bg-warning-soft text-warning">
          <Icon name="alert" size={24} />
        </span>
        <h1 className="m-0 text-display-lg">{title}</h1>
        <p className="m-0 text-body text-ink-muted">{text}</p>
      </section>
      <div className="mt-auto flex flex-col gap-3 p-4">
        <Button variant={whatsapp ? "whatsapp" : "ghost"} size="md" block icon="whatsapp" href={contactHref} target={whatsapp ? "_blank" : undefined}>
          Une question ? Écris-nous
        </Button>
        <Button variant="ghost" size="md" block href="/">
          Revenir à la boutique
        </Button>
      </div>
    </>
  );
}
