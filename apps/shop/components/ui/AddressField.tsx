import { cx } from "@/lib/cx";
import { ADDRESS_MAX } from "@/lib/validation";
import { descriptionId, errorId, Field } from "./Field";

export interface AddressFieldProps {
  id?: string;
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  name?: string;
}

/** Exact copy of docs/SPEC-V2.md › Checkout v2. */
export const ADDRESS_COPY = {
  label: "Adresse exacte",
  description: "Rue, n°, quartier, ville — et un repère si besoin",
  placeholder: "12 rue de Marseille, cité El Khadra, Tunis (près de la pharmacie)",
} as const;

/**
 * 4th checkout field: a 2-line textarea that grows with its content (field-sizing), 16px text,
 * autocomplete="street-address". Personal data: never logged, never put in a URL.
 */
export function AddressField({ id = "sc-f-address", value, onChange, onBlur, error, name = "address" }: AddressFieldProps) {
  return (
    <Field id={id} label={ADDRESS_COPY.label} description={ADDRESS_COPY.description} error={error}>
      <textarea
        id={id}
        name={name}
        rows={2}
        autoComplete="street-address"
        placeholder={ADDRESS_COPY.placeholder}
        maxLength={ADDRESS_MAX}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={cx(descriptionId(id), error && errorId(id))}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        className={cx(
          "block min-h-21 max-h-48 w-full resize-none rounded-md border-[1.5px] border-line-strong bg-surface-raised px-4 py-3",
          "font-sans text-base leading-6 font-semibold text-ink field-sizing-content",
          "placeholder:font-medium placeholder:text-ink-muted focus:border-ink group-data-invalid:border-danger",
        )}
      />
    </Field>
  );
}
