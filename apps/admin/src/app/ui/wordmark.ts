import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Wordmark — le logo NEXO SHIFT (public/assets/logos, copie de design/logos).
 * Par défaut le logo horizontal (cube + nom), avec sa variante claire en thème sombre.
 * `src` force un autre fichier. Ne jamais redessiner le logo.
 */
@Component({
  selector: 'sc-wordmark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center' },
  template: `
    @if (src(); as s) {
      <img [src]="s" alt="NEXO SHIFT" class="block w-auto" [style.height.px]="height()" />
    } @else {
      <img
        src="assets/logos/nexoshift-horizontal.svg"
        alt="NEXO SHIFT"
        class="block w-auto dark:hidden"
        [style.height.px]="height()"
      />
      <img
        src="assets/logos/nexoshift-horizontal-light.svg"
        alt="NEXO SHIFT"
        class="hidden w-auto dark:block"
        [style.height.px]="height()"
      />
    }
  `,
})
export class Wordmark {
  readonly src = input<string | undefined>(undefined);
  readonly height = input(32);
}
