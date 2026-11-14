import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrdersApi } from '../../core/api/orders.api';
import { AppState } from '../../core/app-state';
import { apiErrorMessage } from '../../core/errors';
import { formatNumber } from '../../core/format';
import { OrderSummary } from '../../core/models';
import { toOrderView } from '../../core/order-view';
import { ErrorState } from '../../ui/error-state';
import { Icon } from '../../ui/icon';
import { StatusBadge } from '../../ui/status-badge';

/** /messages — commandes Nouvelles / En attente qui attendent un message WhatsApp. */
@Component({
  selector: 'app-messages-page',
  imports: [RouterLink, ErrorState, Icon, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex flex-col">
        <h1 class="m-0 text-kpi">Messages IA</h1>
        <span class="text-sm text-ink-muted font-semibold">
          Commandes à confirmer sur WhatsApp{{ total() !== null ? ' · ' + total() : '' }}
        </span>
      </div>

      @if (error(); as err) {
        <sc-error-state [message]="err" (retry)="load()" />
      } @else if (loading()) {
        <div class="flex flex-col gap-3" aria-busy="true">
          <span class="sc-sr">Chargement des commandes…</span>
          @for (i of [0, 1, 2, 3]; track i) {
            <div class="sc-skeleton h-20 rounded-md" aria-hidden="true"></div>
          }
        </div>
      } @else {
        <ul class="m-0 p-0 list-none flex flex-col gap-3">
          @for (o of orders(); track o.key) {
            <li>
              <a
                [routerLink]="['/commandes', o.key]"
                [queryParams]="{ tone: o.status === 'pending' ? 'relance' : 'amical' }"
                class="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 rounded-md bg-surface-raised shadow-card no-underline text-ink hover:shadow-lift transition-shadow duration-120"
              >
                <span class="font-display font-extrabold text-base">#{{ o.id }}</span>
                <sc-status-badge [status]="o.status" />
                <span class="font-bold min-w-0 flex-[1_1_10rem] truncate">{{ o.name }}</span>
                <span class="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted">
                  <sc-icon name="pin" [size]="14" />{{ o.city }}
                </span>
                <span class="text-sm font-semibold text-ink-muted">{{ o.age }}</span>
                <span class="ml-auto inline-flex items-center gap-1.5 text-sm font-extrabold text-ink">
                  <sc-icon name="whatsapp" [size]="18" />
                  {{ o.status === 'pending' ? 'Relancer' : 'Écrire le message' }}
                  <sc-icon name="chevronRight" [size]="16" />
                </span>
              </a>
            </li>
          } @empty {
            <li class="p-8 rounded-lg bg-surface-raised shadow-card text-center flex flex-col items-center gap-3">
              <span class="size-11 rounded-pill bg-success-soft text-success grid place-items-center">
                <sc-icon name="check" [size]="22" />
              </span>
              <p class="m-0 text-body">Aucune commande n'attend de message. Les nouvelles commandes arrivent ici.</p>
              <a routerLink="/" class="text-sm font-bold text-orange-ink">Voir le tableau de bord</a>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class MessagesPage {
  private readonly api = inject(OrdersApi);
  private readonly state = inject(AppState);

  protected readonly summaries = signal<OrderSummary[]>([]);
  protected readonly totalElements = signal<number | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  private sub?: Subscription;

  protected readonly orders = computed(() => {
    const now = Date.now();
    return this.summaries().map((s) => toOrderView(s, now));
  });
  protected readonly total = computed(() => {
    const t = this.totalElements();
    return t === null ? null : `${formatNumber(t)} à traiter`;
  });

  constructor() {
    this.load();
    inject(DestroyRef).onDestroy(() => this.sub?.unsubscribe());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.sub?.unsubscribe();
    this.sub = this.api.list({ status: ['NEW', 'PENDING'], size: 100 }).subscribe({
      next: (page) => {
        this.summaries.set(page.content);
        this.totalElements.set(page.totalElements);
        this.state.mobileSubtitle.set(`${formatNumber(page.totalElements)} à traiter`);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, "Les commandes à confirmer n'ont pas pu être chargées."));
      },
    });
  }
}
