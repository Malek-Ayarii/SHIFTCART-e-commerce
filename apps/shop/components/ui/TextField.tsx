import { useId, type InputHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { errorId, Field, inputClass } from "./Field";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  onValueChange?: (value: string) => void;
}

/** The placeholder shows a format example, never the label. */
export function TextField({ label, hint, error, onValueChange, onChange, id, className, ...rest }: TextFieldProps) {
  const auto = useId();
  const fieldId = id ?? `sc-f-${rest.name ?? auto}`;
  return (
    <Field id={fieldId} label={label} hint={hint} error={error}>
      <input
        {...rest}
        id={fieldId}
        className={cx(inputClass, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId(fieldId) : undefined}
        onChange={(e) => {
          onValueChange?.(e.target.value);
          onChange?.(e);
        }}
      />
    </Field>
  );
}
