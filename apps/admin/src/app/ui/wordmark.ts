import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Wordmark — le nom de la marque : l'image fournie quand `src` est donné
 * (public/assets/logos, copie de design/logos), sinon « SHIFT CART » en Syne 800.
 * Ne jamais redessiner le logo.
 */
@Component({
  selector: 'sc-wordmark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center' },
  template: `
    @if (src(); as s) {
      <img [src]="s" alt="SHIFT CART" class="block w-auto" [style.height.px]="height()" />
    } @else {
      <span
        class="text-heading font-extrabold tracking-[0.14em] text-ink whitespace-nowrap"
        aria-label="SHIFT CART"
        >SHIFT<span class="text-orange-ink ml-[0.3em]">CART</span></span
      >
    }
  `,
})
export class Wordmark {
  readonly src = input<string | undefined>(undefined);
  readonly height = input(32);
}
