import { formatTnPhone, phoneDigits } from "@/lib/validation";
import { errorId, Field } from "./Field";

export interface PhoneInputProps {
  id?: string;
  /** 8 raw digits, no spaces. */
  value: string;
  onChange?: (digits: string) => void;
  onBlur?: () => void;
  error?: string | null;
  label?: string;
  hint?: string;
  name?: string;
}

/** Fixed +216 prefix (flag), 8 digits masked as « 98 765 432 », numeric keyboard. */
export function PhoneInput({
  id = "sc-f-phone",
  value,
  onChange,
  onBlur,
  error,
  label = "Numéro de téléphone",
  hint = "(pour la confirmation WhatsApp)",
  name = "phone",
}: PhoneInputProps) {
  return (
    <Field id={id} label={label} hint={hint || undefined} error={error}>
      <div
        className={
          "flex h-13 items-stretch overflow-hidden rounded-md border-[1.5px] border-line-strong bg-surface-raised " +
          "focus-within:border-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring " +
          "group-data-invalid:border-danger"
        }
      >
        <span
          className="flex items-center gap-1.5 border-r-[1.5px] border-line-strong bg-surface-sunken px-3 text-base font-extrabold text-ink"
          aria-hidden="true"
        >
          <span className="sc-flag" />
          +216
        </span>
        <input
          id={id}
          name={name}
          className="h-full w-full min-w-0 bg-transparent px-4 font-sans text-base font-semibold tracking-[0.06em] text-ink outline-none placeholder:font-medium placeholder:text-ink-muted focus-visible:outline-none"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98 765 432"
          value={formatTnPhone(value)}
          maxLength={14}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId(id) : undefined}
          onChange={(e) => onChange?.(phoneDigits(e.target.value).slice(0, 8))}
          onBlur={onBlur}
        />
      </div>
    </Field>
  );
}
