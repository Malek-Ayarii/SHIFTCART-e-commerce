import {
  ArrowRight, Banknote, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Expand, Users, Clock, Coffee, Gift, GripVertical, MapPin, Menu,
  MessageCircle, Package, Pause, Play, Printer, RefreshCw, RotateCcw, ShieldCheck, ShoppingCart, Star,
  Thermometer, TrendingDown, TrendingUp, Truck, X, Zap, type LucideIcon,
} from "lucide-react";
import { cx } from "@/lib/cx";

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
  whatsapp: MessageCircle,
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
