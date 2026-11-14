import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatTnd } from '../core/format';
import { Media } from '../core/models';
import { Icon } from './icon';
import { PackVisual } from './pack-visual';

/** Aperçu en direct de la carte pack de la boutique (« Choisis ta routine »). */
@Component({
  selector: 'sc-shop-card-preview',
  imports: [Icon, PackVisual],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article class="rounded-lg bg-surface-raised shadow-card overflow-hidden" aria-label="Aperçu de la carte boutique">
      <div class="relative aspect-[16/10]">
        <sc-pack-visual class="absolute inset-0" [media]="cover()" [name]="name()" />
        @if (badge()) {
          <span
            class="absolute left-3 top-3 inline-flex items-center h-6 px-2.5 rounded-pill bg-orange text-on-orange text-xs font-extrabold uppercase tracking-[0.04em]"
            >{{ badge() }}</span
          >
        }
      </div>
      <div class="p-4 flex flex-col gap-1.5">
        <h3 class="m-0 font-display font-extrabold text-heading leading-6 line-clamp-2">
          {{ name() || 'Nom du pack' }}
        </h3>
        <p class="m-0 text-body-sm text-ink-muted line-clamp-2">{{ tagline() || 'La promesse du pack s\\'affiche ici.' }}</p>
        @if (audience()) {
          <p class="m-0 text-xs font-semibold text-ink-muted line-clamp-1">Pour : {{ audience() }}</p>
        }
        <div class="flex items-end justify-between gap-3 pt-2">
          <span class="flex flex-col">
            @if ((priceTnd() ?? 0) > 0) {
              <span class="font-display font-extrabold text-display-lg">{{ price() }}</span>
            } @else {
              <span class="self-start inline-flex items-center h-7 px-2 rounded-sm bg-warning-soft text-warning text-xs font-extrabold">Prix [À DÉFINIR]</span>
            }
            <span class="text-xs font-bold text-success">Livraison gratuite</span>
          </span>
          <span class="inline-flex items-center gap-1 text-sm font-extrabold text-orange-ink">
            Découvrir <sc-icon name="chevronRight" [size]="16" />
          </span>
        </div>
      </div>
    </article>
  `,
})
export class ShopCardPreview {
  readonly name = input('');
  readonly badge = input<string | null>(null);
  readonly tagline = input('');
  readonly audience = input<string | null>(null);
  readonly priceTnd = input<number | null>(null);
  readonly cover = input<Media | null>(null);

  protected readonly price = computed(() => {
    const p = this.priceTnd();
    return p && p > 0 ? formatTnd(p) : '[À DÉFINIR]';
  });
}
