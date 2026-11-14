import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  LucideBanknote,
  LucideCalendar,
  LucideCheck,
  LucideChevronDown,
  LucideChevronRight,
  LucideCircleAlert,
  LucideClock,
  LucideCoffee,
  LucideCopy,
  LucideDynamicIcon,
  LucideGift,
  LucideGripVertical,
  LucideIcon,
  LucideLogOut,
  LucideMapPin,
  LucideMenu,
  LucideMessageCircle,
  LucideMoon,
  LucidePackage,
  LucidePause,
  LucidePlay,
  LucidePrinter,
  LucideRefreshCw,
  LucideRotateCcw,
  LucideSearch,
  LucideShieldCheck,
  LucideShoppingCart,
  LucideStar,
  LucideSun,
  LucideThermometer,
  LucideTrendingDown,
  LucideTrendingUp,
  LucideTruck,
  LucideX,
  LucideZap,
} from '@lucide/angular';

/**
 * Correspondance des noms de référence (design/components-reference › Icon) → Lucide
 * (docs/STACK.md). Les derniers noms (search, logout, moon, sun, copy, chevronRight)
 * sont des ajouts propres à l'admin.
 */
const ICONS = {
  menu: LucideMenu,
  cart: LucideShoppingCart,
  play: LucidePlay,
  pause: LucidePause,
  check: LucideCheck,
  x: LucideX,
  chevronDown: LucideChevronDown,
  whatsapp: LucideMessageCircle,
  clock: LucideClock,
  printer: LucidePrinter,
  truck: LucideTruck,
  star: LucideStar,
  package: LucidePackage,
  coffee: LucideCoffee,
  thermo: LucideThermometer,
  gift: LucideGift,
  banknote: LucideBanknote,
  zap: LucideZap,
  pin: LucideMapPin,
  refresh: LucideRefreshCw,
  undo: LucideRotateCcw,
  trendUp: LucideTrendingUp,
  trendDown: LucideTrendingDown,
  grip: LucideGripVertical,
  calendar: LucideCalendar,
  shield: LucideShieldCheck,
  alert: LucideCircleAlert,
  search: LucideSearch,
  logout: LucideLogOut,
  moon: LucideMoon,
  sun: LucideSun,
  copy: LucideCopy,
  chevronRight: LucideChevronRight,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/**
 * Icon — icônes Lucide (trait 2), `currentColor`.
 * Props : `name`, `size` (20), `strokeWidth` (2), `label` (sinon aria-hidden).
 */
@Component({
  selector: 'sc-icon',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex shrink-0',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
  },
  template: `<svg
    [lucideIcon]="icon()"
    [size]="size()"
    [strokeWidth]="strokeWidth()"
    class="block"
    aria-hidden="true"
  ></svg>`,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly strokeWidth = input(2);
  readonly label = input<string | undefined>(undefined);

  protected readonly icon = computed(() => ICONS[this.name()]);
}
