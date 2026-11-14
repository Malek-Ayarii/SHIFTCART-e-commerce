import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export interface FieldProps {
  id: string;
  label: ReactNode;
  hint?: string;
  /** Help line under the label (linked with aria-describedby by the control: descriptionId). */
  description?: string;
  error?: string | null;
  children: ReactNode;
}

export const errorId = (id: string) => `${id}-err`;
export const descriptionId = (id: string) => `${id}-desc`;

/** Visible label above, error under the field (alert icon + danger text). */
export function Field({ id, label, hint, description, error, children }: FieldProps) {
  return (
    <div className={cx("group grid gap-1.5", error && "is-invalid")} data-invalid={error ? "" : undefined}>
      <label htmlFor={id} className="text-sm font-bold leading-5 text-ink">
        {label}
        {hint ? <span className="font-medium text-ink-muted"> {hint}</span> : null}
      </label>
      {description ? (
        <p id={descriptionId(id)} className="-mt-0.5 text-small text-ink-muted">
          {description}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId(id)} className="m-0 flex items-center gap-1 text-meta text-danger">
          <Icon name="alert" size={14} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Shared input look: 52px high, 16px text (no iOS zoom), 1.5px line-strong border. */
export const inputClass =
  "h-13 w-full rounded-md border-[1.5px] border-line-strong bg-surface-raised px-4 font-sans text-base font-semibold text-ink " +
  "placeholder:font-medium placeholder:text-ink-muted focus:border-ink group-data-invalid:border-danger";
