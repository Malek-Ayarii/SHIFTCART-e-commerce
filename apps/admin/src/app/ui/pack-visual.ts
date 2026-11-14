import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Media } from '../core/models';
import { Icon } from './icon';

/**
 * Photo d'un pack (ou d'une pièce) ; sans photo, visuel de secours aux couleurs de la marque
 * (jamais d'image cassée). Le conteneur parent fixe la taille / le ratio.
 */
@Component({
  selector: 'sc-pack-visual',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block overflow-hidden bg-surface-sunken' },
  template: `
    @if (src(); as s) {
      <img
        [src]="s"
        [alt]="alt()"
        loading="lazy"
        decoding="async"
        class="block size-full object-cover"
        [class.object-contain]="contain()"
        draggable="false"
      />
    } @else {
      <!-- Toujours un visuel sombre (en thème sombre, « ink » devient clair : on passe sur surface-sunken). -->
      <div class="size-full bg-ink text-ink-inverse dark:bg-surface-sunken dark:text-ink grid place-items-center">
        @if (compact()) {
          <span class="text-orange grid place-items-center"><sc-icon [name]="icon()" [size]="14" /></span>
        } @else {
          <div class="flex flex-col items-center gap-2 px-3 text-center">
            <span class="size-12 grid place-items-center rounded-pill bg-orange text-on-orange">
              <sc-icon [name]="icon()" [size]="22" />
            </span>
            @if (name()) {
              <span class="font-display font-extrabold text-sm uppercase tracking-[0.04em] opacity-90 line-clamp-2">
                {{ name() }}
              </span>
            }
          </div>
        }
        <span class="sc-sr">{{ alt() || name() }} — pas encore de photo</span>
      </div>
    }
  `,
})
export class PackVisual {
  readonly media = input<Media | null | undefined>(null);
  /** URL directe (ex. productCoverUrl d'une commande) si pas d'objet Media. */
  readonly url = input<string | null | undefined>(null);
  readonly name = input('');
  readonly compact = input(false);
  readonly contain = input(false);
  readonly icon = input<'package' | 'image'>('package');

  protected readonly src = computed(() => this.media()?.url ?? this.url() ?? null);
  protected readonly alt = computed(() => this.media()?.alt ?? (this.name() ? `Photo : ${this.name()}` : ''));
}
