import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Hotspot, Media } from '../core/models';
import { nudgeHotspot, pointToHotspot } from '../core/pack-utils';
import { Icon } from './icon';
import { PackVisual } from './pack-visual';

export interface HotspotPoint {
  /** Clé stable du produit dans la composition. */
  key: string;
  label: string;
  hotspot: Hotspot | null;
}

export interface HotspotChange {
  key: string;
  hotspot: Hotspot | null;
}

/**
 * Éditeur de points d'intérêt : sélectionner un produit puis cliquer sur la photo pour placer sa
 * pastille (x/y en %), glisser pour déplacer, flèches pour ajuster (Maj = 5 %), Suppr pour retirer.
 * Rendu des pastilles identique à la boutique (numéro dans un rond).
 */
@Component({
  selector: 'sc-hotspot-editor',
  imports: [Icon, PackVisual],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (!cover()) {
      <div class="flex items-center gap-3 p-4 rounded-md bg-surface-sunken text-body-sm text-ink-muted">
        <sc-icon name="image" [size]="20" />
        Ajoute d'abord une photo principale pour placer les points d'intérêt.
      </div>
    } @else {
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_--spacing(72)] items-start">
        <div
          #box
          class="relative w-full rounded-md overflow-hidden bg-surface-sunken select-none touch-none"
          [style.aspect-ratio]="ratio()"
        >
          <sc-pack-visual class="absolute inset-0" [media]="cover()" />
          <button
            type="button"
            class="absolute inset-0 w-full h-full border-0 bg-transparent p-0 focus-visible:outline-offset-[-4px]"
            [class]="selectedPoint() ? 'cursor-crosshair' : 'cursor-default'"
            [attr.aria-label]="surfaceLabel()"
            [disabled]="!selectedPoint()"
            (click)="place($event)"
          ></button>
          @for (p of points(); track p.key; let i = $index) {
            @if (p.hotspot; as h) {
              <button
                type="button"
                class="absolute -translate-x-1/2 -translate-y-1/2 size-11 grid place-items-center rounded-pill border-0 bg-transparent p-0 cursor-grab active:cursor-grabbing touch-none"
                [style.left.%]="h.x"
                [style.top.%]="h.y"
                [attr.data-hotspot]="p.key"
                [attr.aria-label]="'Pastille ' + (i + 1) + ' : ' + p.label + ', ' + h.x + ' % / ' + h.y + ' %. Flèches pour déplacer, Suppr pour retirer.'"
                [attr.aria-pressed]="selected() === p.key"
                (pointerdown)="startDrag($event, p.key)"
                (pointermove)="drag($event, p.key)"
                (pointerup)="endDrag($event)"
                (pointercancel)="endDrag($event)"
                (keydown)="onKey($event, p)"
                (click)="selected.set(p.key)"
              >
                <span
                  class="size-8 grid place-items-center rounded-pill font-sans font-extrabold text-sm shadow-lift transition-transform duration-120 motion-reduce:transition-none"
                  [class]="
                    selected() === p.key
                      ? 'bg-orange text-on-orange scale-110 shadow-[0_0_0_3px_var(--surface-raised)]'
                      : 'bg-surface-raised text-ink shadow-[0_0_0_2px_var(--ink)]'
                  "
                  >{{ i + 1 }}</span
                >
              </button>
            }
          }
          @if (selectedPoint(); as sp) {
            <div
              class="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-pill bg-ink text-ink-inverse text-xs font-bold shadow-card max-w-[calc(100%-1.5rem)]"
              aria-hidden="true"
            >
              <sc-icon name="crosshair" [size]="14" />
              <span class="truncate">{{ sp.hotspot ? 'Glisse ou clique pour déplacer' : 'Clique pour placer' }} : {{ sp.label }}</span>
            </div>
          }
        </div>

        <div class="flex flex-col gap-2">
          <p class="m-0 text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Produits du pack</p>
          @for (p of points(); track p.key; let i = $index) {
            <div
              class="flex items-center gap-2 p-1.5 pl-2 rounded-md transition-colors duration-120"
              [class]="selected() === p.key ? 'bg-orange-soft' : 'bg-surface-sunken'"
            >
              <button
                type="button"
                class="flex-1 min-w-0 flex items-center gap-2.5 min-h-11 border-0 bg-transparent text-left text-ink cursor-pointer p-0 rounded-sm"
                [attr.aria-pressed]="selected() === p.key"
                (click)="selected.set(selected() === p.key ? null : p.key)"
              >
                <span
                  class="size-7 shrink-0 grid place-items-center rounded-pill font-sans font-extrabold text-xs"
                  [class]="p.hotspot ? 'bg-ink text-ink-inverse' : 'bg-surface-raised text-ink-muted shadow-[inset_0_0_0_1.5px_var(--line-strong)]'"
                  >{{ i + 1 }}</span
                >
                <span class="flex flex-col min-w-0">
                  <span class="text-sm font-bold truncate">{{ p.label }}</span>
                  <span class="text-xs font-semibold text-ink-muted">
                    {{ p.hotspot ? 'x ' + p.hotspot.x + ' % · y ' + p.hotspot.y + ' %' : 'Pas encore placé' }}
                  </span>
                </span>
              </button>
              @if (p.hotspot) {
                <button
                  type="button"
                  class="size-11 shrink-0 grid place-items-center rounded-sm border-0 bg-transparent text-ink-muted cursor-pointer hover:text-danger hover:bg-surface-raised"
                  [attr.aria-label]="'Retirer la pastille de ' + p.label"
                  (click)="changed.emit({ key: p.key, hotspot: null })"
                >
                  <sc-icon name="x" [size]="16" />
                </button>
              }
            </div>
          } @empty {
            <p class="m-0 text-body-sm text-ink-muted">Ajoute des produits dans la composition pour placer leurs pastilles.</p>
          }
          <p class="m-0 mt-1 text-xs font-semibold text-ink-muted leading-4.5">
            Sélectionne un produit, puis clique sur la photo. Flèches : ajuster (Maj = 5 %).
          </p>
        </div>
      </div>
    }
  `,
})
export class HotspotEditor {
  readonly cover = input<Media | null>(null);
  readonly points = input<HotspotPoint[]>([]);
  readonly selected = model<string | null>(null);
  readonly changed = output<HotspotChange>();

  private readonly box = viewChild<ElementRef<HTMLElement>>('box');
  private readonly draggingKey = signal<string | null>(null);

  protected readonly ratio = computed(() => {
    const c = this.cover();
    return c?.width && c?.height ? `${c.width} / ${c.height}` : '16 / 10';
  });

  protected readonly selectedPoint = computed(
    () => this.points().find((p) => p.key === this.selected()) ?? null,
  );

  protected readonly surfaceLabel = computed(() => {
    const p = this.selectedPoint();
    return p
      ? `Photo principale : cliquer pour placer la pastille de ${p.label}`
      : 'Photo principale : sélectionne un produit pour placer sa pastille';
  });

  /** Clic sur la photo ; au clavier (Entrée, sans coordonnées) → centre de la photo. */
  protected place(e: MouseEvent): void {
    const p = this.selectedPoint();
    const el = this.box()?.nativeElement;
    if (!p || !el) return;
    const hotspot = e.detail === 0 && e.clientX === 0 && e.clientY === 0
      ? { x: 50, y: 50 }
      : pointToHotspot(e.clientX, e.clientY, el.getBoundingClientRect());
    this.changed.emit({ key: p.key, hotspot });
  }

  protected startDrag(e: PointerEvent, key: string): void {
    if (e.button !== 0) return;
    this.selected.set(key);
    this.draggingKey.set(key);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
    (e.currentTarget as HTMLElement).focus();
  }

  protected drag(e: PointerEvent, key: string): void {
    if (this.draggingKey() !== key) return;
    const el = this.box()?.nativeElement;
    if (!el) return;
    this.changed.emit({ key, hotspot: pointToHotspot(e.clientX, e.clientY, el.getBoundingClientRect()) });
  }

  protected endDrag(e: PointerEvent): void {
    this.draggingKey.set(null);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  protected onKey(e: KeyboardEvent, p: HotspotPoint): void {
    if (!p.hotspot) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.changed.emit({ key: p.key, hotspot: null });
      return;
    }
    const next = nudgeHotspot(p.hotspot, e.key, e.shiftKey);
    if (next) {
      e.preventDefault();
      this.selected.set(p.key);
      this.changed.emit({ key: p.key, hotspot: next });
    }
  }
}
