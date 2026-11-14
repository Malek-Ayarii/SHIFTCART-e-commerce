import { GOVERNORATES, POPULAR } from "@/lib/validation";
import { errorId, Field, inputClass } from "./Field";
import { Icon } from "./Icon";

export interface GovernorateSelectProps {
  id?: string;
  value?: string;
  onChange?: (governorate: string) => void;
  onBlur?: () => void;
  error?: string | null;
  popular?: readonly string[];
  label?: string;
  name?: string;
}

/** Native <select>: on mobile it opens the system wheel, faster than a custom list. */
export function GovernorateSelect({
  id = "sc-f-gov",
  value = "",
  onChange,
  onBlur,
  error,
  popular = POPULAR,
  label = "Ville / Gouvernorat",
  name = "governorate",
}: GovernorateSelectProps) {
  const rest = GOVERNORATES.filter((g) => !popular.includes(g));
  return (
    <Field id={id} label={label} error={error}>
      <div className="relative">
        <Icon name="pin" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-orange-ink" />
        <select
          id={id}
          name={name}
          className={`${inputClass} cursor-pointer appearance-none pr-12 pl-11`}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId(id) : undefined}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
        >
          <option value="" disabled>
            Choisis ton gouvernorat
          </option>
          <optgroup label="Les plus demandés">
            {popular.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </optgroup>
          <optgroup label="Tous les gouvernorats">
            {rest.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </optgroup>
        </select>
        <Icon name="chevronDown" size={20} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink" />
      </div>
    </Field>
  );
}
