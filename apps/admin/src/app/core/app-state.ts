import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { currentMonth } from './format';
import { StockOverview } from './models';

/** Sous 768px : vue mobile équipe (C5). */
export const MOBILE_QUERY = '(max-width: 767.98px)';

/** État partagé entre écrans : mois sélectionné, viewport, résumé stock, sous-titre mobile. */
@Injectable({ providedIn: 'root' })
export class AppState {
  private readonly breakpoints = inject(BreakpointObserver);

  /** Mois affiché (YYYY-MM), partagé par le tableau de bord et les finances. */
  readonly month = signal(currentMonth());

  readonly isMobile = toSignal(
    this.breakpoints.observe(MOBILE_QUERY).pipe(map((s) => s.matches)),
    { initialValue: this.breakpoints.isMatched(MOBILE_QUERY) },
  );

  /** Filtre « pack » du tableau de bord (productId), null = tous les packs. */
  readonly productFilter = signal<number | null>(null);

  /** Dernier état du stock connu (alerte de la barre latérale). */
  readonly stock = signal<StockOverview | null>(null);

  /** Sous-titre de la barre du haut en mobile (« Nov. 2026 · 142 au total »). */
  readonly mobileSubtitle = signal<string>('');
}
