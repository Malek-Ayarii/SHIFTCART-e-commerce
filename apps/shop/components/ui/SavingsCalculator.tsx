"use client";

import { useId, useState, type CSSProperties } from "react";
import { formatAmount, formatDecimal } from "@/lib/format";
import type { Savings } from "@/lib/catalog-map";
import { paybackDays, SAVINGS_DEFAULTS, savingsFor, treatFor } from "@/lib/savings";

export interface SavingsCalculatorProps {
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  homeCostPerDay?: number;
  daysPerMonth?: number;
  packPrice?: number;
  /** Question above the slider (Savings.question). */
  question?: string;
  /** Accessible name of the slider. */
  sliderLabel?: string;
  /** What the home alternative is, in the formula (« de café maison »). */
  homeLabel?: string;
  /** Pack config from the API (docs/CONTRACT.md › v2 Savings): overrides the numeric props. */
  config?: Savings | null;
  onChange?: (dailySpend: number, monthlySaving: number) => void;
}

/** Props of a calculator driven by a pack's Savings config. */
export function savingsPropsFrom(config: Savings): Partial<SavingsCalculatorProps> {
  const coffee = /caf[ée]/i.test(config.question);
  return {
    min: config.min,
    max: config.max,
    step: config.step,
    defaultValue: config.defaultValue,
    homeCostPerDay: config.homeCostPerDay,
    daysPerMonth: config.daysPerMonth,
    question: config.question,
    sliderLabel: coffee ? "Dépense café par jour, en dinars" : "Dépense par jour, en dinars",
    homeLabel: coffee ? "de café maison" : "fait maison",
  };
}

/**
 * Slider 4–10 DT/day → monthly saving, a concrete equivalent and the payback period.
 * The formula stays visible: a saving figure without its calculation looks inflated.
 */
export function SavingsCalculator(props: SavingsCalculatorProps) {
  const merged = props.config ? { ...props, ...savingsPropsFrom(props.config) } : props;
  return <SavingsCalculatorView {...merged} />;
}

function SavingsCalculatorView({
  min = SAVINGS_DEFAULTS.min,
  max = SAVINGS_DEFAULTS.max,
  step = SAVINGS_DEFAULTS.step,
  defaultValue = SAVINGS_DEFAULTS.defaultValue,
  homeCostPerDay = SAVINGS_DEFAULTS.homeCostPerDay,
  daysPerMonth = SAVINGS_DEFAULTS.daysPerMonth,
  packPrice = 89,
  question = "Combien tu dépenses par jour en café ?",
  sliderLabel = "Dépense café par jour, en dinars",
  homeLabel = "de café maison",
  onChange,
}: SavingsCalculatorProps) {
  const [daily, setDaily] = useState(defaultValue);
  const id = useId();
  const saved = savingsFor(daily, homeCostPerDay, daysPerMonth);
  const payback = paybackDays(packPrice, daily, homeCostPerDay);
  const fill = `${((daily - min) / (max - min)) * 100}%`;

  function change(v: number) {
    setDaily(v);
    onChange?.(v, savingsFor(v, homeCostPerDay, daysPerMonth));
  }

  return (
    <section className="grid gap-4 rounded-lg bg-ink p-5 text-ink-inverse" aria-labelledby={`${id}-q`}>
      <p className="m-0 text-title" id={`${id}-q`}>
        {question} <span className="font-display text-xl font-extrabold text-orange">{formatDecimal(daily)} DT</span>
      </p>
      <div>
        <label className="sr-only" htmlFor={id}>
          {sliderLabel}
        </label>
        <input
          id={id}
          className="sc-slider"
          type="range"
          min={min}
          max={max}
          step={step}
          value={daily}
          style={{ "--fill": fill } as CSSProperties}
          aria-valuetext={`${formatDecimal(daily)} dinars par jour`}
          onChange={(e) => change(parseFloat(e.target.value))}
        />
        <div className="-mt-2 flex justify-between text-meta opacity-70" aria-hidden="true">
          <span>{min} DT</span>
          <span>{max} DT</span>
        </div>
      </div>
      <div className="grid gap-1 rounded-md bg-orange p-4 text-on-orange" aria-live="polite">
        <span className="text-label uppercase font-extrabold">Tu économises</span>
        <span className="text-price leading-10" data-testid="savings-amount">
          {formatAmount(saved)}
          <small className="text-lg"> DT / mois</small>
        </span>
        <span className="text-sm leading-5 font-semibold">
          Soit {treatFor(saved)}. Pack remboursé en {payback} jours.
        </span>
      </div>
      <p className="m-0 text-xs leading-4 opacity-70">
        Calcul : (dépense/jour − {formatDecimal(homeCostPerDay)} DT {homeLabel}) × {daysPerMonth} jours.
      </p>
    </section>
  );
}
