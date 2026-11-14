import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon, IconName } from './icon';

export type ButtonVariant = 'primary' | 'dark' | 'ghost' | 'whatsapp';
export type ButtonSize = 'sm' | 'md' | 'xl';

const BASE =
  'appearance-none border-0 cursor-pointer font-sans font-bold inline-flex items-center justify-center gap-2 rounded-md no-underline transition-[transform,background-color,box-shadow] duration-120 ease-out active:scale-97 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100 select-none';

const SIZES: Record<ButtonSize, string> = {
  // 36px visuels (référence sc-btn--sm), zone de tap étendue à 44px (règle d'accessibilité).
  sm: "relative h-9 px-3 text-sm leading-5 rounded-sm before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
  md: 'h-12 px-5 text-base leading-6',
  xl: 'min-h-16 px-6 py-3 text-cta uppercase rounded-lg',
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-orange text-on-orange hover:bg-orange-hover',
  dark: 'bg-ink text-ink-inverse',
  ghost: 'bg-surface-raised text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-sunken',
  whatsapp: 'bg-success text-on-success',
};

/**
 * Button — `variant` primary | dark | ghost | whatsapp, `size` sm | md | xl, `block`, `icon`, `iconRight`.
 * S'applique à un vrai <button> ou <a> : `<button scButton variant="dark">…</button>`.
 * `primary` (orange, texte on-orange) : UNE action par écran.
 */
@Component({
  // Composant attribut : s'applique à un vrai <button> ou <a> (accessibilité native).
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[scButton], a[scButton]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
  template: `
    @if (icon(); as i) {
      <sc-icon [name]="i" [size]="iconSize()" />
    }
    <span><ng-content /></span>
    @if (iconRight(); as r) {
      <sc-icon [name]="r" [size]="iconSize()" />
    }
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly block = input(false);
  readonly icon = input<IconName | undefined>(undefined);
  readonly iconRight = input<IconName | undefined>(undefined);

  protected readonly iconSize = computed(() =>
    this.size() === 'xl' ? 22 : this.size() === 'sm' ? 16 : 18,
  );

  protected readonly classes = computed(() => {
    const v = this.variant();
    const s = this.size();
    const xlPrimary =
      v === 'primary' && s === 'xl'
        ? 'shadow-[0_6px_0_0_var(--ink)] active:translate-y-1 active:scale-100 active:shadow-[0_2px_0_0_var(--ink)]'
        : '';
    return [BASE, SIZES[s], VARIANTS[v], xlPrimary, this.block() ? 'flex w-full' : '']
      .filter(Boolean)
      .join(' ');
  });
}
