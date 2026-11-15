import {
  ArrowRight, Banknote, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Expand, Users, Clock, Coffee, Gift, GripVertical, MapPin, Menu,
  MessageCircle, Package, Pause, Play, Printer, RefreshCw, RotateCcw, ShieldCheck, ShoppingCart, Star,
  Thermometer, TrendingDown, TrendingUp, Truck, X, Zap, Smartphone, Sparkles, PackageCheck, HandCoins, MousePointerClick, BadgeCheck, Phone, Copy, Lock, Home, type LucideIcon, createLucideIcon,
} from "lucide-react";
import { cx } from "@/lib/cx";

/**
 * WhatsApp-style glyph (speech bubble + handset), drawn on the Lucide 24px grid so it matches the
 * other strokes. Used for every WhatsApp action.
 */
const WhatsApp = createLucideIcon("whatsapp", [
  ["path", { d: "M3.5 20.5l1.3-4.1A8.6 8.6 0 1 1 8 19.4z", key: "bubble" }],
  ["path", { d: "M9.2 8.4c.2-.5.6-.6.9-.6h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c-.1.2-.1.4 0 .6.6 1.1 1.4 1.9 2.5 2.5.2.1.4.1.6 0l.6-.5c.2-.1.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.7-.6.9-.6.3-1.6.5-3-.1a8.3 8.3 0 0 1-3.9-3.9c-.6-1.4-.4-2.4-.1-3.1z", key: "handset" }],
]);

/** Reference icon names (design/components-reference/index.d.ts) → Lucide (docs/STACK.md). */
export const ICONS = {
  menu: Menu,
  cart: ShoppingCart,
  play: Play,
  pause: Pause,
  check: Check,
  x: X,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  arrowRight: ArrowRight,
  expand: Expand,
  users: Users,
  whatsapp: WhatsApp,
  message: MessageCircle,
  smartphone: Smartphone,
  sparkles: Sparkles,
  packageCheck: PackageCheck,
  handCoins: HandCoins,
  tap: MousePointerClick,
  badgeCheck: BadgeCheck,
  phone: Phone,
  copy: Copy,
  lock: Lock,
  home: Home,
  clock: Clock,
  printer: Printer,
  truck: Truck,
  star: Star,
  package: Package,
  coffee: Coffee,
  thermo: Thermometer,
  gift: Gift,
  banknote: Banknote,
  zap: Zap,
  pin: MapPin,
  refresh: RefreshCw,
  undo: RotateCcw,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  grip: GripVertical,
  calendar: Calendar,
  shield: ShieldCheck,
  alert: CircleAlert,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Icons drawn filled in the reference bundle. */
const FILLED: ReadonlySet<IconName> = new Set<IconName>(["play", "pause", "star"]);

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  /** Makes the icon readable by screen readers; otherwise aria-hidden. */
  label?: string;
  className?: string;
}

export function Icon({ name, size = 20, strokeWidth = 2, label, className }: IconProps) {
  const Cmp = ICONS[name] ?? Package;
  return (
    <Cmp
      size={size}
      strokeWidth={strokeWidth}
      fill={FILLED.has(name) ? "currentColor" : "none"}
      className={cx("block flex-none", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    />
  );
}
