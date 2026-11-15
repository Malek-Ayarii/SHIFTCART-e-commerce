import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "dark" | "ghost" | "whatsapp";
export type ButtonSize = "sm" | "md" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  /** Renders a link instead of a button (internal paths use next/link). */
  href?: string;
  target?: string;
  rel?: string;
  children?: ReactNode;
}

const BASE =
  "inline-flex items-center justify-center gap-2 font-sans font-bold no-underline cursor-pointer select-none " +
  "transition-[transform,background-color,box-shadow,color] duration-200 ease-sc active:scale-97 " +
  "motion-reduce:transition-none motion-reduce:active:scale-100 " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 rounded-sm px-3 text-sm",
  md: "h-12 rounded-md px-5 text-base",
  xl: "min-h-15 rounded-md px-6 py-3 text-cta uppercase",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-orange text-on-orange hover:bg-orange-hover",
  dark: "bg-ink text-ink-inverse hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0",
  ghost: "bg-surface-raised text-ink ring-inset-strong hover:bg-surface-sunken",
  whatsapp: "bg-whatsapp text-on-whatsapp shadow-whatsapp hover:-translate-y-0.5 hover:bg-whatsapp-hover motion-reduce:hover:translate-y-0",
};

/**
 * The giant primary CTA: soft orange glow, lifts on hover, presses on tap, with a light sweep that
 * runs every few seconds to draw the eye (hidden with reduced motion).
 */
const PRIMARY_XL =
  "relative isolate overflow-hidden shadow-cta hover:-translate-y-0.5 active:translate-y-0.5 active:scale-100 active:shadow-cta-pressed " +
  "motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0 " +
  "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:-z-10 before:w-1/3 before:bg-surface-raised/35 before:content-[''] before:animate-shine motion-reduce:before:hidden";

export function buttonClasses({ variant = "primary", size = "md", block, className }: Pick<ButtonProps, "variant" | "size" | "block" | "className">) {
  return cx(BASE, SIZES[size], VARIANTS[variant], variant === "primary" && size === "xl" && PRIMARY_XL, block && "flex w-full", className);
}

export function Button({ variant = "primary", size = "md", block, icon, iconRight, href, target, rel, className, children, type, ...rest }: ButtonProps) {
  const iconSize = size === "xl" ? 22 : size === "sm" ? 16 : 18;
  const cls = buttonClasses({ variant, size, block, className });
  const content = (
    <>
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      <span>{children}</span>
      {iconRight ? <Icon name={iconRight} size={iconSize} /> : null}
    </>
  );
  if (href) {
    const linkProps = {
      className: cls,
      target,
      rel: target === "_blank" ? (rel ?? "noopener noreferrer") : rel,
      id: rest.id,
      onClick: rest.onClick as never,
      "aria-label": rest["aria-label"],
      "aria-disabled": rest.disabled ? true : undefined,
    };
    if (href.startsWith("/") && !target) {
      return (
        <Link href={href} {...linkProps}>
          {content}
        </Link>
      );
    }
    return (
      <a href={href} {...linkProps}>
        {content}
      </a>
    );
  }
  return (
    <button type={type ?? "button"} className={cls} {...rest}>
      {content}
    </button>
  );
}
