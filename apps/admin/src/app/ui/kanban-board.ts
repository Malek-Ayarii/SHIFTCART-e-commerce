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
import { OrderActionEvent, OrderCard } from './order-card';

export interface OrderMoveEvent {
  order: Order;
  from: OrderStatus;
  to: OrderStatus;
}

/**
 * KanbanBoard — pipeline COD en 4 colonnes (Nouvelles, En attente, Confirmées, Expédiées).
 * Glisser-déposer (CDK) + ← → au clavier sur une carte focalisée.
 * Seules les transitions autorisées sont acceptées : les autres émettent `rejected`.
 * Le parent applique le déplacement (optimiste) en mettant à jour `orders`.
 */
@Component({
  selector: 'sc-kanban-board',
  imports: [CdkDropListGroup, CdkDropList, CdkDrag, OrderCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      [attr.aria-labelledby]="titleHidden() ? null : 'board-title'"
      [attr.aria-label]="titleHidden() ? title() : null"
    >
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-4">
        @if (!titleHidden()) {
          <h2 id="board-title" class="m-0 text-heading font-extrabold uppercase tracking-[0.02em]">
            {{ title() }}
          </h2>
        }
        <span class="text-sm font-semibold text-ink-muted">
          Glisse une carte (ou ← → au clavier) pour changer son statut
        </span>
      </div>
      <div
        cdkDropListGroup
        class="grid grid-cols-[repeat(4,minmax(--spacing(60),1fr))] gap-4 overflow-x-auto pb-2"
      >
        @for (lane of lanes(); track lane) {
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
            class="flex flex-col gap-3 min-h-80 p-3 rounded-lg transition-[box-shadow,background-color] duration-120 motion-reduce:transition-none"
            [class]="laneClass(lane)"
          >
            <div class="flex items-center gap-2 px-1 pt-1">
              <span class="size-2.5 rounded-pill shrink-0" [class]="meta[lane].dotClass"></span>
              <span class="text-label font-extrabold uppercase">{{ meta[lane].lane }}</span>
              <span
                class="ml-auto min-w-6.5 h-5.5 px-2 rounded-pill bg-surface-raised text-xs font-extrabold grid place-items-center"
                data-testid="lane-count"
                >{{ countFor(lane) }}</span
              >
            </div>
            @if (loading()) {
              @for (s of skeletons; track s) {
                <div class="sc-skeleton h-30 rounded-md" aria-hidden="true"></div>
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
  /** La page affiche déjà son propre titre : pas de <h2>, la section est nommée par aria-label. */
  readonly titleHidden = input(false);
  readonly loading = input(false);

  readonly move = output<OrderMoveEvent>();
  readonly rejected = output<OrderMoveEvent>();
  readonly action = output<OrderActionEvent>();
  readonly open = output<Order>();

  protected readonly meta = STATUS_META;
  protected readonly skeletons = [0, 1];
  protected readonly over = signal<OrderStatus | null>(null);
  protected readonly dragging = signal<Order | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly ordersByLane = computed(() => {
    const map = {} as Record<OrderStatus, Order[]>;
    for (const lane of this.lanes()) map[lane] = [];
    for (const o of this.orders()) map[o.status]?.push(o);
    return map;
  });

  protected countFor(lane: OrderStatus): number {
    const c = this.counts()?.[lane];
    return c ?? this.ordersByLane()[lane]?.length ?? 0;
  }

  protected laneClass(lane: OrderStatus): string {
    const dragged = this.dragging();
    if (this.over() === lane && dragged && dragged.status !== lane) {
      return canTransition(dragged.status, lane)
        ? 'bg-orange-soft shadow-[inset_0_0_0_2px_var(--orange)]'
        : 'bg-surface-sunken shadow-[inset_0_0_0_2px_var(--line-strong)] cursor-not-allowed';
    }
    return 'bg-surface-sunken';
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
    if (this.request(order, lanes[j])) this.refocus(order.key);
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
