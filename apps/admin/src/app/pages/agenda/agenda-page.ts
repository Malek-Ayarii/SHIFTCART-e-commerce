import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, map } from 'rxjs';
import { OrdersApi } from '../../core/api/orders.api';
import { ProductsApi } from '../../core/api/products.api';
import { StatsApi } from '../../core/api/stats.api';
import { AppState } from '../../core/app-state';
import { apiErrorMessage } from '../../core/errors';
import { formatNumber, formatTnd } from '../../core/format';
import { CalendarDay, CalendarYear, OrderSummary, ProductAdmin } from '../../core/models';
import { Order, toOrderView } from '../../core/order-view';
import { ErrorState } from '../../ui/error-state';
import { Icon } from '../../ui/icon';
import { PackVisual } from '../../ui/pack-visual';
import { StatusBadge } from '../../ui/status-badge';
import {
  AgendaView,
  MONTHS_LONG,
  MONTHS_SHORT,
  WEEKDAYS_SHORT,
  addDays,
  addMonths,
  heatBackground,
  heatLevel,
  isValidIso,
  longDayLabel,
  monthGrid,
  parts,
  shortDayLabel,
  toIso,
  todayIso,
  tunisTime,
} from './agenda-dates';

const VIEWS: { key: AgendaView; label: string }[] = [
  { key: 'jour', label: 'Jour' },
  { key: 'mois', label: 'Mois' },
  { key: 'annee', label: 'Année' },
];

/** Commandes d'une journée chargées au plus (au-delà : « + N »). */
const DAY_PAGE = 200;

interface Totals {
  orders: number;
  revenue: number;
  delivered: number;
  returned: number;
  cancelled: number;
}

function sum(days: CalendarDay[]): Totals {
  return days.reduce<Totals>(
    (t, d) => ({
      orders: t.orders + d.orders,
      revenue: t.revenue + d.orderedTnd,
      delivered: t.delivered + d.delivered,
      returned: t.returned + d.returned,
      cancelled: t.cancelled + d.cancelled,
    }),
    { orders: 0, revenue: 0, delivered: 0, returned: 0, cancelled: 0 },
  );
}

/** /agenda — les commandes par jour, par mois et par année (heure de Tunis). */
@Component({
  selector: 'app-agenda-page',
  imports: [RouterLink, NgTemplateOutlet, ErrorState, Icon, PackVisual, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './agenda-page.html',
})
export class AgendaPage {
  private readonly stats = inject(StatsApi);
  private readonly ordersApi = inject(OrdersApi);
  private readonly productsApi = inject(ProductsApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly state = inject(AppState);

  protected readonly views = VIEWS;
  protected readonly weekdays = WEEKDAYS_SHORT;
  protected readonly today = todayIso();
  protected readonly heatBg = heatBackground;
  protected readonly fmtNum = formatNumber;
  protected readonly fmtTnd = formatTnd;
  protected readonly Math = Math;

  // ---------- État (dans l'URL : ?vue=mois&date=2026-11-19) ----------
  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly view = computed<AgendaView>(() => {
    const v = this.query().get('vue');
    return v === 'jour' || v === 'annee' ? v : 'mois';
  });
  protected readonly date = computed(() => {
    const d = this.query().get('date');
    return isValidIso(d) ? d : this.today;
  });
  protected readonly year = computed(() => parts(this.date()).y);
  protected readonly month = computed(() => parts(this.date()).m);

  // ---------- Packs (filtre partagé avec le tableau de bord) ----------
  protected readonly packs = signal<ProductAdmin[]>([]);
  protected readonly selectedPack = computed(
    () => this.packs().find((p) => p.id === this.state.productFilter()) ?? null,
  );

  // ---------- Données de l'année ----------
  protected readonly calendar = signal<CalendarYear | null>(null);
  protected readonly calendarLoading = signal(true);
  protected readonly calendarError = signal<string | null>(null);
  private calendarSub?: Subscription;
  private readonly byDate = computed(() => new Map((this.calendar()?.days ?? []).map((d) => [d.date, d])));

  // ---------- Commandes du jour ----------
  protected readonly dayOrders = signal<OrderSummary[]>([]);
  protected readonly dayTotal = signal(0);
  protected readonly dayLoading = signal(false);
  protected readonly dayError = signal<string | null>(null);
  private daySub?: Subscription;

  constructor() {
    effect(() => {
      const year = this.year();
      const product = this.state.productFilter();
      untracked(() => this.loadCalendar(year, product));
    });
    effect(() => {
      const view = this.view();
      const date = this.date();
      const product = this.state.productFilter();
      if (view === 'jour') untracked(() => this.loadDay(date, product));
    });
    effect(() => {
      this.state.mobileSubtitle.set(this.title());
    });
    this.productsApi
      .list()
      .pipe(
        map((list) => [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (list) => this.packs.set(list), error: () => this.packs.set([]) });
    inject(DestroyRef).onDestroy(() => {
      this.calendarSub?.unsubscribe();
      this.daySub?.unsubscribe();
    });
  }

  protected loadCalendar(year = this.year(), product = this.state.productFilter()): void {
    this.calendarLoading.set(true);
    this.calendarError.set(null);
    this.calendarSub?.unsubscribe();
    this.calendarSub = this.stats.calendar(year, product).subscribe({
      next: (c) => {
        this.calendar.set(c);
        this.calendarLoading.set(false);
      },
      error: (err) => {
        this.calendarLoading.set(false);
        this.calendarError.set(apiErrorMessage(err, "L'agenda n'a pas pu être chargé."));
      },
    });
  }

  protected loadDay(date = this.date(), product = this.state.productFilter()): void {
    this.dayLoading.set(true);
    this.dayError.set(null);
    this.daySub?.unsubscribe();
    this.daySub = this.ordersApi.list({ day: date, size: DAY_PAGE, productId: product }).subscribe({
      next: (page) => {
        // Ordre chronologique dans la journée.
        this.dayOrders.set([...page.content].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
        this.dayTotal.set(page.totalElements);
        this.dayLoading.set(false);
      },
      error: (err) => {
        this.dayLoading.set(false);
        this.dayError.set(apiErrorMessage(err, "Les commandes du jour n'ont pas pu être chargées."));
      },
    });
  }

  // ---------- Navigation ----------

  protected go(view: AgendaView, date: string = this.date()): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vue: view, date },
      replaceUrl: true,
    });
  }

  protected step(delta: number): void {
    const v = this.view();
    const d = this.date();
    const next = v === 'jour' ? addDays(d, delta) : v === 'mois' ? addMonths(d, delta) : addMonths(d, delta * 12);
    this.go(v, next);
  }

  protected goToday(): void {
    this.go(this.view(), this.today);
  }

  protected openDay(iso: string): void {
    this.go('jour', iso);
  }

  protected openMonth(m: number): void {
    this.go('mois', toIso(this.year(), m, 1));
  }

  protected selectPack(id: number | null): void {
    this.state.productFilter.set(id);
  }

  protected readonly title = computed(() => {
    const v = this.view();
    if (v === 'jour') return longDayLabel(this.date());
    if (v === 'mois') return `${MONTHS_LONG[this.month() - 1]} ${this.year()}`;
    return String(this.year());
  });

  protected readonly isCurrent = computed(() => {
    const v = this.view();
    const t = parts(this.today);
    const d = parts(this.date());
    if (v === 'jour') return this.date() === this.today;
    if (v === 'mois') return t.y === d.y && t.m === d.m;
    return t.y === d.y;
  });

  protected readonly prevLabel = computed(() =>
    this.view() === 'jour' ? 'Jour précédent' : this.view() === 'mois' ? 'Mois précédent' : 'Année précédente',
  );
  protected readonly nextLabel = computed(() =>
    this.view() === 'jour' ? 'Jour suivant' : this.view() === 'mois' ? 'Mois suivant' : 'Année suivante',
  );

  // ---------- Vue Mois ----------

  protected readonly monthDays = computed(() => {
    const y = this.year();
    const m = this.month();
    const prefix = `${y}-${String(m).padStart(2, '0')}-`;
    return (this.calendar()?.days ?? []).filter((d) => d.date.startsWith(prefix));
  });

  protected readonly monthTotals = computed(() => sum(this.monthDays()));

  protected readonly monthBest = computed(() => {
    const days = this.monthDays();
    const best = days.reduce<CalendarDay | null>((b, d) => (d.orders > (b?.orders ?? 0) ? d : b), null);
    return best ? { label: shortDayLabel(best.date), orders: best.orders, date: best.date } : null;
  });

  protected readonly weeks = computed(() => {
    const max = Math.max(0, ...this.monthDays().map((d) => d.orders));
    return monthGrid(this.year(), this.month()).map((week) =>
      week.map((iso) => {
        if (!iso) return null;
        const d = this.byDate().get(iso);
        const orders = d?.orders ?? 0;
        return {
          iso,
          day: parts(iso).d,
          orders,
          revenue: d?.orderedTnd ?? 0,
          delivered: d?.delivered ?? 0,
          returned: d?.returned ?? 0,
          cancelled: d?.cancelled ?? 0,
          level: heatLevel(orders, max),
          isToday: iso === this.today,
          isFuture: iso > this.today,
          isBest: orders > 0 && orders === max,
          label: `${longDayLabel(iso)} : ${orders} commande${orders > 1 ? 's' : ''}, ${formatTnd(d?.orderedTnd ?? 0)}`,
        };
      }),
    );
  });

  // ---------- Vue Année ----------

  protected readonly months = computed(() => {
    const y = this.year();
    const days = this.calendar()?.days ?? [];
    const perMonth = Array.from({ length: 12 }, (_, i) => {
      const prefix = `${y}-${String(i + 1).padStart(2, '0')}-`;
      return days.filter((d) => d.date.startsWith(prefix));
    });
    const dayMax = Math.max(0, ...days.map((d) => d.orders));
    const totals = perMonth.map(sum);
    const monthMax = Math.max(0, ...totals.map((t) => t.orders));
    const t = parts(this.today);
    return perMonth.map((list, i) => ({
      m: i + 1,
      name: MONTHS_LONG[i],
      short: MONTHS_SHORT[i],
      totals: totals[i],
      barPct: monthMax ? (totals[i].orders / monthMax) * 100 : 0,
      isBest: monthMax > 0 && totals[i].orders === monthMax,
      isCurrent: t.y === y && t.m === i + 1,
      isFuture: y > t.y || (y === t.y && i + 1 > t.m),
      grid: monthGrid(y, i + 1).map((week) =>
        week.map((iso) => {
          if (!iso) return null;
          const o = this.byDate().get(iso)?.orders ?? 0;
          return { iso, level: heatLevel(o, dayMax), title: `${shortDayLabel(iso)} : ${o}` };
        }),
      ),
    }));
  });

  protected readonly yearTotals = computed(() => sum(this.calendar()?.days ?? []));

  protected readonly yearBest = computed(() => {
    const best = this.months().reduce<{ name: string; orders: number } | null>(
      (b, m) => (m.totals.orders > (b?.orders ?? 0) ? { name: m.name, orders: m.totals.orders } : b),
      null,
    );
    return best;
  });

  // ---------- Vue Jour ----------

  protected readonly dayStats = computed(() => this.byDate().get(this.date()) ?? null);

  protected readonly dayTimeline = computed<{ time: string; order: Order; summary: OrderSummary }[]>(() => {
    const now = Date.now();
    return this.dayOrders().map((s) => ({ time: tunisTime(s.createdAt).label, order: toOrderView(s, now), summary: s }));
  });

  protected readonly hours = computed(() => {
    const counts = Array.from({ length: 24 }, () => 0);
    for (const s of this.dayOrders()) counts[tunisTime(s.createdAt).hour]++;
    const max = Math.max(0, ...counts);
    // Une heure de pointe n'est mise en avant que si elle est unique.
    const uniquePeak = max > 0 && counts.filter((c) => c === max).length === 1;
    return counts.map((c, h) => ({
      h,
      count: c,
      pct: max ? (c / max) * 100 : 0,
      isPeak: uniquePeak && c === max,
    }));
  });

  protected readonly peakHour = computed(() => {
    const peak = this.hours().find((h) => h.isPeak);
    return peak ? `${String(peak.h).padStart(2, '0')} h` : null;
  });
}
