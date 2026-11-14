import { cx } from "@/lib/cx";
import type { UiOrderStatus } from "@/lib/types";
import { Icon, type IconName } from "./Icon";

/** Always word + icon + colour (docs/API.md › statuts). */
export const STATUS_META: Record<UiOrderStatus, { label: string; icon: IconName; className: string }> = {
  new: { label: "Nouvelle", icon: "zap", className: "bg-orange-soft text-orange-ink" },
  pending: { label: "En attente", icon: "clock", className: "bg-warning-soft text-warning" },
  confirmed: { label: "Confirmée", icon: "check", className: "bg-success-soft text-success" },
  shipped: { label: "Expédiée", icon: "truck", className: "bg-info-soft text-info" },
  delivered: { label: "Livrée", icon: "banknote", className: "bg-success-soft text-success" },
  returned: { label: "Retournée", icon: "undo", className: "bg-danger-soft text-danger" },
  cancelled: { label: "Annulée", icon: "x", className: "bg-surface-sunken text-ink-muted" },
};

export interface StatusBadgeProps {
  status: UiOrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = STATUS_META[status] ?? STATUS_META.new;
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-sm px-2 text-xs font-extrabold uppercase tracking-[0.04em]",
        s.className,
        className,
      )}
    >
      <Icon name={s.icon} size={12} strokeWidth={2.5} />
      {s.label}
    </span>
  );
}
