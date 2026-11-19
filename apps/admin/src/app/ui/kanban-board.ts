import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Order } from '../core/order-view';
import { KANBAN_LANES, OrderStatus, STATUS_META, canTransition } from '../core/status';
import { Icon } from './icon';
import { OrderActionEvent, OrderCard } from './order-card';

export interface OrderMoveEvent {
  order: Order;
  from: OrderStatus;
  to: OrderStatus;
}

/** Listes repliées, mémorisées par navigateur (simple confort, jamais indispensable). */
const COLLAPSED_KEY = 'sc.kanban.collapsed';

function readCollapsed(): OrderStatus[] {
  try {
    const raw = globalThis.localStorage?.getItem(COLLAPSED_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list.filter((v) => typeof v === 'string') as OrderStatus[]) : [];
  } catch {
    return [];
  }
}

function writeCollapsed(list: OrderStatus[]): void {
  try {
    globalThis.localStorage?.setItem(COLLAPSED_KEY, JSON.stringify(list));
  } catch {
    /* stockage indisponible : le repli reste valable pour la session */
  }
}

/**
 * KanbanBoard — pipeline COD façon Trello : une liste colorée par statut (Nouvelles, En attente,
 * Confirmées, Expédiées), défilement horizontal, listes repliables, cartes compactes.
 * Glisser-déposer (CDK) + ← → au clavier sur une carte focalisée.
 * Seules les transitions autorisées sont acceptées : les autres émettent `rejected`.
 * Le parent applique le déplacement (optimiste) en mettant à jour `orders`.
 */
@Component({
  selector: 'sc-kanban-board',
  imports: [CdkDropListGroup, CdkDropList, CdkDrag, OrderCard, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section aria-labelledby="board-title">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
        <h2 id="board-title" class="m-0 text-heading font-extrabold">
          {{ title() }}
        </h2>
        <span class="text-sm font-semibold text-ink-muted">
          Glisse une carte (ou ← → au clavier) pour changer son statut
        </span>
      </div>
      <div
        cdkDropListGroup
        class="flex items-start gap-3 overflow-x-auto pb-3 -mx-1 px-1 [scrollbar-width:thin]"
      >
        @for (lane of lanes(); track lane) {
          @let folded = isCollapsed(lane);
          <div
            cdkDropList
            cdkDropListSortingDisabled
            [cdkDropListData]="lane"
            [id]="'lane-' + lane"
            (cdkDropListDropped)="onDrop($event)"
            (cdkDropListEntered)="over.set(lane)"
            (cdkDropListExited)="over() === lane && over.set(null)"
            role="list"
            [attr.aria-label]="meta[lane].lane"
            [attr.data-lane]="lane"
            class="shrink-0 basis-auto flex flex-col rounded-lg max-h-[calc(100dvh-var(--spacing)*40)] min-h-40 overflow-y-auto overscroll-contain [scrollbar-width:thin] transition-[box-shadow,width] duration-200 motion-reduce:transition-none"
            [class]="laneClass(lane)"
          >
            @if (folded) {
              <!-- Liste repliée : barre verticale, toujours une cible de dépôt -->
              <button
                type="button"
                class="flex-1 flex flex-col items-center gap-3 py-3 border-0 bg-transparent cursor-pointer rounded-lg hover:bg-surface-raised/40"
                [class]="meta[lane].laneInk"
                [attr.aria-expanded]="false"
                [attr.aria-label]="'Déplier la liste ' + meta[lane].lane"
                (click)="toggle(lane)"
              >
                <sc-icon name="unfold" [size]="18" />
                <span
                  class="min-w-6.5 h-5.5 px-1.5 rounded-pill bg-surface-raised text-ink text-xs font-extrabold grid place-items-center"
                  data-testid="lane-count"
                  >{{ countFor(lane) }}</span
                >
                <span class="text-sm font-extrabold [writing-mode:vertical-rl] whitespace-nowrap inline-flex items-center gap-2">
                  {{ meta[lane].lane }}
                </span>
              </button>
            } @else {
              <!-- En-tête collant, façon Trello : statut (mot + icône), compteur, replier -->
              <div
                class="sticky top-0 z-10 flex items-center gap-2 pl-3.5 pr-1.5 pt-2.5 pb-2 rounded-t-lg"
                [class]="meta[lane].laneBg"
              >
                <span class="inline-flex items-center gap-1.5 min-w-0" [class]="meta[lane].laneInk">
                  <sc-icon [name]="meta[lane].icon" [size]="16" [strokeWidth]="2.5" />
                  <span class="text-sm font-extrabold truncate">{{ meta[lane].lane }}</span>
                </span>
                <span
                  class="ml-auto min-w-6.5 h-5.5 px-2 rounded-pill bg-surface-raised text-ink text-xs font-extrabold grid place-items-center"
                  data-testid="lane-count"
                  >{{ countFor(lane) }}</span
                >
                <button
                  type="button"
                  class="size-11 -my-1.5 grid place-items-center rounded-sm border-0 bg-transparent cursor-pointer text-ink-muted hover:text-ink hover:bg-surface-raised/60"
                  [attr.aria-expanded]="true"
                  [attr.aria-label]="'Replier la liste ' + meta[lane].lane"
                  title="Replier la liste"
                  (click)="toggle(lane)"
                >
                  <sc-icon name="fold" [size]="16" />
                </button>
              </div>

              <div class="flex flex-col gap-2 px-2 pb-2">
                @if (loading()) {
                  @for (s of skeletons; track s) {
                    <div class="sc-skeleton h-24 rounded-md bg-surface-raised/70" aria-hidden="true"></div>
                  }
                } @else {
                  @for (o of ordersByLane()[lane]; track o.key) {
                    <div
                      role="listitem"
                      cdkDrag
                      [cdkDragData]="o"
                      (cdkDragStarted)="dragging.set(o)"
                      (cdkDragEnded)="dragging.set(null); over.set(null)"
                      (keydown)="onKey($event, o)"
                    >
                      <sc-order-card
                        [order]="o"
                        [draggable]="true"
                        [dragging]="dragging()?.key === o.key"
                        (action)="action.emit($event)"
                        (open)="open.emit($event)"
                      />
                    </div>
                  } @empty {
                    <div
                      class="border-[1.5px] border-dashed border-line-strong rounded-md py-5 px-3 text-center text-label tracking-normal font-semibold text-ink-muted"
                    >
                      Dépose une commande ici
                    </div>
                  }
                }
              </div>

              @if (hiddenCount(lane); as more) {
                <p
                  class="sticky bottom-0 m-0 px-3.5 py-2.5 rounded-b-lg text-xs font-bold text-ink-muted"
                  [class]="meta[lane].laneBg"
                >
                  + {{ more }} autre{{ more > 1 ? 's' : '' }} · affine avec la recherche
                </p>
              }
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class KanbanBoard {
  readonly orders = input<Order[]>([]);
  readonly lanes = input<readonly OrderStatus[]>(KANBAN_LANES);
  readonly counts = input<Partial<Record<OrderStatus, number>> | null>(null);
  readonly title = input('Pipeline des commandes');
  readonly loading = input(false);

  readonly move = output<OrderMoveEvent>();
  readonly rejected = output<OrderMoveEvent>();
  readonly action = output<OrderActionEvent>();
  readonly open = output<Order>();

  protected readonly meta = STATUS_META;
  protected readonly skeletons = [0, 1];
  protected readonly over = signal<OrderStatus | null>(null);
  protected readonly dragging = signal<Order | null>(null);
  protected readonly collapsed = signal<OrderStatus[]>(readCollapsed());

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly ordersByLane = computed(() => {
    const map = {} as Record<OrderStatus, Order[]>;
    for (const lane of this.lanes()) map[lane] = [];
    for (const o of this.orders()) map[o.status]?.push(o);
    return map;
  });

  protected isCollapsed(lane: OrderStatus): boolean {
    return this.collapsed().includes(lane);
  }

  protected toggle(lane: OrderStatus): void {
    const next = this.isCollapsed(lane)
      ? this.collapsed().filter((l) => l !== lane)
      : [...this.collapsed(), lane];
    this.collapsed.set(next);
    writeCollapsed(next);
  }

  protected countFor(lane: OrderStatus): number {
    const c = this.counts()?.[lane];
    return c ?? this.ordersByLane()[lane]?.length ?? 0;
  }

  /** Commandes du statut non chargées (le serveur en renvoie au plus 50 par colonne). */
  protected hiddenCount(lane: OrderStatus): number {
    if (this.loading()) return 0;
    return Math.max(0, this.countFor(lane) - (this.ordersByLane()[lane]?.length ?? 0));
  }

  protected laneClass(lane: OrderStatus): string {
    // Dépliées : les listes se partagent la largeur (4 visibles sur desktop), sinon défilement horizontal.
    const base = `${this.meta[lane].laneBg} ${this.isCollapsed(lane) ? 'w-14' : 'flex-1 min-w-64 max-w-96'}`;
    const dragged = this.dragging();
    if (this.over() === lane && dragged && dragged.status !== lane) {
      return canTransition(dragged.status, lane)
        ? `${base} shadow-[inset_0_0_0_2px_var(--orange)]`
        : `${base} shadow-[inset_0_0_0_2px_var(--line-strong)] cursor-not-allowed opacity-70`;
    }
    return base;
  }

  protected onDrop(event: CdkDragDrop<OrderStatus, OrderStatus, Order>): void {
    const order = event.item.data;
    const to = event.container.data;
    this.over.set(null);
    this.dragging.set(null);
    if (event.previousContainer === event.container || order.status === to) return;
    this.request(order, to);
  }

  /** ← / → sur une carte focalisée : colonne précédente / suivante. */
  onKey(event: KeyboardEvent, order: Order): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    // Seulement sur la carte elle-même (pas sur son bouton d'action ni pendant un glisser).
    const target = event.target as HTMLElement | null;
    if (!target?.hasAttribute('data-order-key') || this.dragging()) return;
    const lanes = this.lanes();
    const i = lanes.indexOf(order.status);
    const j = event.key === 'ArrowRight' ? i + 1 : i - 1;
    if (i < 0 || j < 0 || j >= lanes.length) return;
    event.preventDefault();
    if (this.request(order, lanes[j])) {
      // Une carte envoyée dans une liste repliée la déplie : le focus la suit.
      if (this.isCollapsed(lanes[j])) this.toggle(lanes[j]);
      this.refocus(order.key);
    }
  }

  private request(order: Order, to: OrderStatus): boolean {
    const evt: OrderMoveEvent = { order, from: order.status, to };
    if (!canTransition(order.status, to)) {
      this.rejected.emit(evt);
      return false;
    }
    this.move.emit(evt);
    return true;
  }

  /** Garde le focus sur la carte après son changement de colonne. */
  private refocus(key: number): void {
    afterNextRender(
      () => {
        const el = this.host.nativeElement.querySelector<HTMLElement>(`[data-order-key="${key}"]`);
        el?.focus();
      },
      { injector: this.injector },
    );
  }
}
