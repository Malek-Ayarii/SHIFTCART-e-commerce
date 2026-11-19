import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
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
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subscription, debounceTime, distinctUntilChanged, forkJoin, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrdersApi } from '../../core/api/orders.api';
import { ProductsApi } from '../../core/api/products.api';
import { StatsApi } from '../../core/api/stats.api';
import { StockApi } from '../../core/api/stock.api';
import { AppState } from '../../core/app-state';
import { DeliverySlipService } from '../../core/delivery-slip.service';
import { apiErrorMessage } from '../../core/errors';
import { formatNumber, formatPct, monthLabel, monthShortLabel, refNumber } from '../../core/format';
import {
  AnalyticsStats,
  KpiStats,
  OrderCounts,
  OrderSummary,
  ProductAdmin,
  StatusUpdateRequest,
} from '../../core/models';
import { Period, comparisonWindow, granularityFor, periodLabel } from '../../core/period';
import { Order, toOrderView, toSummary } from '../../core/order-view';
import {
  KANBAN_LANES,
  OrderStatus,
  STATUS_META,
  toApiStatus,
  transitionRejectedMessage,
} from '../../core/status';
import { ToastService } from '../../core/toast.service';
import { ErrorState } from '../../ui/error-state';
import { PackVisual } from '../../ui/pack-visual';
import { Icon } from '../../ui/icon';
import { KanbanBoard, OrderMoveEvent } from '../../ui/kanban-board';
import { MonthPicker } from '../../ui/month-picker';
import { OrderActionEvent, OrderCard } from '../../ui/order-card';
import { PeriodPicker } from '../../ui/period-picker';
import { ShipDialog, ShipInfo } from '../../ui/ship-dialog';
import { AnalyticsPanel } from './analytics-panel';

const GRANULARITY_LABEL = {
  hour: 'par heure',
  day: 'par jour',
  week: 'par semaine',
  month: 'par mois',
} as const;

/** Nombre max de cartes chargées par colonne (le compteur vient du serveur). */
const LANE_SIZE = 50;

/**
 * / — C1 tableau de bord : analytique sur une période (jour, semaine, mois, année, libre) puis pipeline Kanban du
 * mois ; sous 768px, C5 liste mobile filtrable.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [
    KanbanBoard,
    MonthPicker,
    ErrorState,
    OrderCard,
    Icon,
    ShipDialog,
    PackVisual,
    NgTemplateOutlet,
    PeriodPicker,
    AnalyticsPanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly ordersApi = inject(OrdersApi);
  private readonly statsApi = inject(StatsApi);
  private readonly productsApi = inject(ProductsApi);
  private readonly stockApi = inject(StockApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly slip = inject(DeliverySlipService);
  private readonly doc = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly state = inject(AppState);

  protected readonly lanes = KANBAN_LANES;
  protected readonly meta = STATUS_META;

  // ---------- Filtres ----------
  protected readonly search = signal('');
  /** Recherche envoyée au serveur (debounce 300 ms). */
  protected readonly q = signal('');
  protected readonly mobileFilter = signal<OrderStatus>('new');

  /** Packs proposés dans le filtre (vide si l'API ne répond pas : filtre masqué). */
  protected readonly packs = signal<ProductAdmin[]>([]);
  protected readonly selectedPack = computed(
    () => this.packs().find((p) => p.id === this.state.productFilter()) ?? null,
  );

  // ---------- Données ----------
  protected readonly kpis = signal<KpiStats | null>(null);
  protected readonly kpisLoading = signal(true);
  protected readonly kpisError = signal<string | null>(null);

  protected readonly analytics = signal<AnalyticsStats | null>(null);
  protected readonly analyticsLoading = signal(true);
  protected readonly analyticsError = signal<string | null>(null);

  private readonly serverCounts = signal<OrderCounts | null>(null);
  /** Totaux par colonne quand une recherche est active (totalElements). */
  private readonly searchTotals = signal<Partial<Record<OrderStatus, number>> | null>(null);
  protected readonly summaries = signal<OrderSummary[]>([]);
  protected readonly boardLoading = signal(true);
  protected readonly boardError = signal<string | null>(null);

  protected readonly now = signal(Date.now());
  private pendingMoves = 0;
  /** Incrémenté à chaque déplacement : un rafraîchissement lancé avant est périmé. */
  private moveVersion = 0;
  private boardSub?: Subscription;
  private kpiSub?: Subscription;
  private analyticsSub?: Subscription;

  /** Commande en attente du transporteur (fenêtre « Expédier »). */
  protected readonly shipTarget = signal<Order | null>(null);

  protected readonly packName = computed(() => this.selectedPack()?.name ?? 'Tous les packs');
  protected readonly analyticsTitle = computed(
    () =>
      `${periodLabel(this.state.period())} · ${this.packName()} · ${GRANULARITY_LABEL[granularityFor(this.state.period())]}`,
  );
  protected readonly pipelineTitle = computed(
    () => `${monthLabel(this.state.month())} · ${this.packName().toLowerCase()} · pipeline COD`,
  );

  protected readonly orders = computed<Order[]>(() => {
    const now = this.now();
    return this.summaries().map((s) => toOrderView(s, now));
  });

  protected readonly laneCounts = computed<Partial<Record<OrderStatus, number>>>(() => {
    const totals = this.searchTotals();
    if (totals) return totals;
    const c = this.serverCounts();
    if (!c) return {};
    return { new: c.NEW, pending: c.PENDING, confirmed: c.CONFIRMED, shipped: c.SHIPPED };
  });

  // ---------- Vue mobile (C5) ----------
  protected readonly mobileTabs = computed(() => {
    const counts = this.laneCounts();
    const orders = this.orders();
    return this.lanes.map((lane) => ({
      lane,
      label: STATUS_META[lane].lane,
      count: counts[lane] ?? orders.filter((o) => o.status === lane).length,
    }));
  });
  protected readonly mobileOrders = computed(() =>
    this.orders().filter((o) => o.status === this.mobileFilter()),
  );
  protected readonly mobileKpis = computed(() => {
    const k = this.kpis();
    return k
      ? {
          revenue: formatNumber(k.revenueTnd),
          toConfirm: formatNumber(k.toConfirm),
          returns: formatPct(k.returnRatePct),
        }
      : null;
  });

  constructor() {
    // Recherche : debounce → q serveur.
    toObservable(this.search)
      .pipe(
        map((s) => s.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((q) => this.q.set(q));

    // Mois / pack → tout recharger ; recherche → recharger le Kanban.
    effect(() => {
      const month = this.state.month();
      this.state.productFilter();
      untracked(() => this.loadKpis(month, false));
    });
    // Période / pack → recharger l'analytique (desktop uniquement : la vue mobile n'en affiche pas).
    effect(() => {
      const period = this.state.period();
      this.state.productFilter();
      if (this.state.isMobile()) return;
      untracked(() => this.loadAnalytics(period, false));
    });
    effect(() => {
      const month = this.state.month();
      const q = this.q();
      this.state.productFilter();
      untracked(() => this.loadBoard(month, q, false));
    });
    this.productsApi
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (list) =>
          this.packs.set([...list].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)),
        error: () => this.packs.set([]),
      });

    // Sous-titre de la barre du haut en mobile : « Nov. 2026 · 142 au total ».
    effect(() => {
      const k = this.kpis();
      const label = monthShortLabel(this.state.month());
      this.state.mobileSubtitle.set(k ? `${label} · ${formatNumber(k.orders)} au total` : label);
    });

    this.startPolling();
    this.destroyRef.onDestroy(() => {
      this.boardSub?.unsubscribe();
      this.kpiSub?.unsubscribe();
      this.analyticsSub?.unsubscribe();
    });
  }

  // ---------- Chargement ----------

  protected reloadAll(): void {
    this.loadKpis(this.state.month(), false);
    this.loadBoard(this.state.month(), this.q(), false);
    if (!this.state.isMobile()) this.loadAnalytics(this.state.period(), false);
  }

  /** Rechargement silencieux : le rendu précédent reste affiché (atténué) jusqu'à la réponse. */
  private loadAnalytics(period: Period, quiet: boolean): void {
    if (!quiet) {
      this.analyticsLoading.set(true);
      this.analyticsError.set(null);
    }
    this.analyticsSub?.unsubscribe();
    this.analyticsSub = this.statsApi
      .analytics(
        period.from,
        period.to,
        granularityFor(period),
        this.state.productFilter(),
        comparisonWindow(period),
      )
      .subscribe({
        next: (a) => {
          this.analytics.set(a);
          this.analyticsLoading.set(false);
          this.analyticsError.set(null);
        },
        error: (err) => {
          this.analyticsLoading.set(false);
          if (!quiet || !this.analytics()) {
            this.analyticsError.set(apiErrorMessage(err, "L'analytique n'a pas pu être chargée."));
          }
        },
      });
  }

  private loadKpis(month: string, quiet: boolean): void {
    if (!quiet) {
      this.kpisLoading.set(true);
      this.kpisError.set(null);
    }
    this.kpiSub?.unsubscribe();
    this.kpiSub = this.statsApi.kpis(month, this.state.productFilter()).subscribe({
      next: (k) => {
        this.kpis.set(k);
        this.kpisLoading.set(false);
        this.kpisError.set(null);
      },
      error: (err) => {
        this.kpisLoading.set(false);
        if (!quiet || !this.kpis()) {
          this.kpisError.set(apiErrorMessage(err, "Les indicateurs n'ont pas pu être chargés."));
        }
      },
    });
  }

  private loadBoard(month: string, q: string, quiet: boolean): void {
    if (!quiet) {
      this.boardLoading.set(true);
      this.boardError.set(null);
    }
    this.boardSub?.unsubscribe();
    const version = this.moveVersion;
    const productId = this.state.productFilter();
    this.boardSub = forkJoin({
      counts: this.ordersApi.counts(month, productId),
      pages: forkJoin(
        this.lanes.map((lane) =>
          this.ordersApi.list({
            status: [toApiStatus(lane)],
            month,
            q: q || undefined,
            size: LANE_SIZE,
            productId,
          }),
        ),
      ),
    }).subscribe({
      next: ({ counts, pages }) => {
        // Ne pas écraser un déplacement en cours ou fait pendant ce rafraîchissement silencieux.
        if (quiet && (this.pendingMoves > 0 || version !== this.moveVersion)) return;
        this.serverCounts.set(counts);
        this.searchTotals.set(
          q
            ? Object.fromEntries(this.lanes.map((lane, i) => [lane, pages[i].totalElements]))
            : null,
        );
        this.summaries.set(pages.flatMap((p) => p.content));
        this.now.set(Date.now());
        this.boardLoading.set(false);
        this.boardError.set(null);
      },
      error: (err) => {
        this.boardLoading.set(false);
        if (!quiet || this.summaries().length === 0) {
          this.boardError.set(apiErrorMessage(err, "Les commandes n'ont pas pu être chargées."));
        }
      },
    });
  }

  /** Nouvelles commandes toutes les 30 s, en pause quand l'onglet est masqué. */
  private startPolling(): void {
    const tick = () => {
      if (this.doc.hidden || this.pendingMoves > 0 || this.shipTarget()) return;
      this.loadBoard(this.state.month(), this.q(), true);
      this.loadKpis(this.state.month(), true);
      if (!this.state.isMobile()) this.loadAnalytics(this.state.period(), true);
    };
    const id = setInterval(tick, environment.pollIntervalMs);
    const onVisible = () => {
      if (!this.doc.hidden) tick();
    };
    this.doc.addEventListener('visibilitychange', onVisible);
    this.destroyRef.onDestroy(() => {
      clearInterval(id);
      this.doc.removeEventListener('visibilitychange', onVisible);
    });
  }

  // ---------- Kanban ----------

  protected onMove(evt: OrderMoveEvent): void {
    if (evt.to === 'shipped') {
      this.shipTarget.set(evt.order);
      return;
    }
    this.applyMove(evt.order, evt.to, {});
  }

  protected onRejected(evt: OrderMoveEvent): void {
    this.toast.error(transitionRejectedMessage(evt.from, evt.to));
  }

  protected onShipConfirmed(info: ShipInfo): void {
    const order = this.shipTarget();
    this.shipTarget.set(null);
    if (order) this.applyMove(order, 'shipped', info);
  }

  /** Déplacement optimiste + PATCH ; rollback et message en cas d'échec (409…). */
  private applyMove(order: Order, to: OrderStatus, extra: Partial<StatusUpdateRequest>): void {
    const previous = this.summaries().find((s) => s.id === order.key);
    if (!previous) return;
    const from = order.status;
    const apiTo = toApiStatus(to);
    const prevCounts = this.serverCounts();
    const prevTotals = this.searchTotals();

    this.summaries.update((list) =>
      list.map((s) =>
        s.id === order.key
          ? {
              ...s,
              status: apiTo,
              carrier: extra.carrier ?? s.carrier,
              trackingNumber: extra.trackingNumber ?? s.trackingNumber,
            }
          : s,
      ),
    );
    this.shiftCounts(from, to);
    this.pendingMoves++;
    this.moveVersion++;

    this.ordersApi.updateStatus(order.key, { status: apiTo, ...extra }).subscribe({
      next: (detail) => {
        this.pendingMoves--;
        this.summaries.update((list) =>
          list.map((s) => (s.id === detail.id ? toSummary(detail) : s)),
        );
        this.toast.success(`#${refNumber(detail.ref)} : ${STATUS_META[to].label.toLowerCase()}.`);
        this.loadKpis(this.state.month(), true);
        if (!this.state.isMobile()) this.loadAnalytics(this.state.period(), true);
        if (to === 'shipped') this.refreshStock();
      },
      error: (err) => {
        this.pendingMoves--;
        this.summaries.update((list) => list.map((s) => (s.id === previous.id ? previous : s)));
        this.serverCounts.set(prevCounts);
        this.searchTotals.set(prevTotals);
        this.toast.error(
          apiErrorMessage(err, `Le statut de #${order.id} n'a pas pu être changé. Réessaie.`),
        );
      },
    });
  }

  private shiftCounts(from: OrderStatus, to: OrderStatus): void {
    const c = this.serverCounts();
    if (c) {
      const fromKey = toApiStatus(from);
      const toKey = toApiStatus(to);
      this.serverCounts.set({
        ...c,
        [fromKey]: Math.max(0, c[fromKey] - 1),
        [toKey]: c[toKey] + 1,
      });
    }
    const t = this.searchTotals();
    if (t) {
      this.searchTotals.set({
        ...t,
        [from]: Math.max(0, (t[from] ?? 1) - 1),
        [to]: (t[to] ?? 0) + 1,
      });
    }
  }

  /** Le passage en SHIPPED décrémente les packs complets : l'alerte latérale se met à jour. */
  private refreshStock(): void {
    this.stockApi.get().subscribe({ next: (s) => this.state.stock.set(s), error: () => undefined });
  }

  // ---------- Actions des cartes ----------

  protected onAction(evt: OrderActionEvent): void {
    const o = evt.order;
    switch (evt.action) {
      case 'whatsapp':
        void this.router.navigate(['/commandes', o.key], { queryParams: { tone: 'amical' } });
        break;
      case 'remind':
        void this.router.navigate(['/commandes', o.key], { queryParams: { tone: 'relance' } });
        break;
      case 'print':
        void this.slip.open(o.key, `SC-${o.id}`);
        break;
    }
  }

  protected selectPack(id: number | null): void {
    this.state.productFilter.set(id);
  }

  protected openOrder(o: Order): void {
    void this.router.navigate(['/commandes', o.key]);
  }
}
