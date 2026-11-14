import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductsApi } from '../../core/api/products.api';
import { AppState } from '../../core/app-state';
import { apiErrorMessage } from '../../core/errors';
import { formatNumber, formatTnd } from '../../core/format';
import { ProductAdmin } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Button } from '../../ui/button';
import { ErrorState } from '../../ui/error-state';
import { Icon } from '../../ui/icon';
import { PackStatus } from '../../ui/pack-status';
import { PackVisual } from '../../ui/pack-visual';

/** /packs — catalogue des packs (actifs et brouillons), ordre d'affichage par glisser-déposer. */
@Component({
  selector: 'app-packs-page',
  imports: [RouterLink, CdkDropList, CdkDrag, CdkDragHandle, Button, ErrorState, Icon, PackStatus, PackVisual],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './packs-page.html',
})
export class PacksPage {
  private readonly api = inject(ProductsApi);
  private readonly toast = inject(ToastService);
  private readonly state = inject(AppState);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly packs = signal<ProductAdmin[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly savingOrder = signal(false);
  /** Annonce lecteur d'écran après un déplacement. */
  protected readonly announce = signal('');
  private sub?: Subscription;

  protected readonly summary = computed(() => {
    const list = this.packs();
    const active = list.filter((p) => p.active).length;
    return `${list.length} pack${list.length > 1 ? 's' : ''} · ${active} actif${active > 1 ? 's' : ''} · ${list.length - active} brouillon${list.length - active > 1 ? 's' : ''}`;
  });

  constructor() {
    this.load();
    inject(DestroyRef).onDestroy(() => this.sub?.unsubscribe());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.sub?.unsubscribe();
    this.sub = this.api.list().subscribe({
      next: (list) => {
        this.packs.set([...list].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));
        this.loading.set(false);
        this.state.mobileSubtitle.set(this.summary());
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, "Les packs n'ont pas pu être chargés."));
      },
    });
  }

  protected price(p: ProductAdmin): string {
    return p.priceTnd > 0 ? formatTnd(p.priceTnd) : '[À DÉFINIR]';
  }

  protected num(n: number): string {
    return formatNumber(n);
  }

  protected onDrop(e: CdkDragDrop<ProductAdmin[]>): void {
    if (e.previousIndex === e.currentIndex) return;
    this.move(e.previousIndex, e.currentIndex);
  }

  /** Au clavier sur la poignée : ← ↑ avance, → ↓ recule. */
  protected onHandleKey(e: KeyboardEvent, index: number): void {
    const delta = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 0;
    if (!delta) return;
    const to = index + delta;
    if (to < 0 || to >= this.packs().length) return;
    e.preventDefault();
    const id = this.packs()[index].id;
    this.move(index, to);
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>(`[data-handle="${id}"]`)?.focus(),
      { injector: this.injector },
    );
  }

  private move(from: number, to: number): void {
    const previous = this.packs();
    const next = [...previous];
    moveItemInArray(next, from, to);
    this.packs.set(next.map((p, i) => ({ ...p, sortOrder: i })));
    this.announce.set(`${next[to].name} : position ${to + 1} sur ${next.length}.`);
    this.savingOrder.set(true);
    this.api.reorder(next.map((p) => p.id)).subscribe({
      next: () => {
        this.savingOrder.set(false);
        this.toast.success('Ordre d\'affichage enregistré.');
      },
      error: (err) => {
        this.savingOrder.set(false);
        this.packs.set(previous);
        this.toast.error(apiErrorMessage(err, "L'ordre n'a pas pu être enregistré. Réessaie."));
      },
    });
  }
}
