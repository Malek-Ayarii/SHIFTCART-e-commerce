import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StockApi } from '../../core/api/stock.api';
import { AppState } from '../../core/app-state';
import { apiErrorMessage } from '../../core/errors';
import { formatNumber, formatPct, formatTnd } from '../../core/format';
import { StockItem, StockItemPatch, StockOverview } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Button } from '../../ui/button';
import { DemoBadge } from '../../ui/demo-badge';
import { ErrorState } from '../../ui/error-state';
import { Icon } from '../../ui/icon';

export type StockField = 'unitCostTnd' | 'quantity' | 'threshold';

/** /stock — C4 stock des pièces, packs assemblables et marge par pack. */
@Component({
  selector: 'app-stock-page',
  imports: [Button, DemoBadge, ErrorState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './stock-page.html',
})
export class StockPage {
  private readonly api = inject(StockApi);
  private readonly toast = inject(ToastService);
  private readonly state = inject(AppState);
  protected readonly demo = environment.demoDataBadge;

  protected readonly stock = signal<StockOverview | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly assembling = signal(false);
  /** Cellule en cours d'enregistrement : `${id}:${field}`. */
  protected readonly saving = signal<string | null>(null);
  private sub?: Subscription;

  protected readonly agentNumber = environment.agentWhatsappNumber.replace(/\D/g, '');

  protected readonly limiting = computed(() => {
    const s = this.stock();
    if (!s || s.items.length === 0) return null;
    let min: StockItem | null = null;
    for (const it of s.items) {
      if (it.perPack <= 0) continue;
      if (!min || Math.floor(it.quantity / it.perPack) < Math.floor(min.quantity / min.perPack)) min = it;
    }
    return min;
  });

  protected readonly margin = computed(() => {
    const s = this.stock();
    if (!s) return null;
    return {
      price: formatTnd(s.packPriceTnd),
      cogs: formatTnd(s.cogsTnd),
      carrier: formatTnd(s.carrierFeeTnd),
      margin: formatTnd(s.marginTnd),
      pct: formatPct(s.marginPct, 0),
      gauge: Math.max(0, Math.min(100, s.marginPct)),
      costsUndefined: s.cogsTnd === 0,
      carrierUndefined: s.carrierFeeTnd === 0,
    };
  });

  protected readonly alertWhatsappUrl = computed(() => {
    const s = this.stock();
    if (!this.agentNumber || !s) return null;
    const text = `Stock bas SHIFT CART : plus que ${s.completePacks} packs complets (seuil : ${s.packThreshold}). ${s.assemblablePacks} packs assemblables avec les pièces en stock.`;
    return `https://wa.me/${this.agentNumber}?text=${encodeURIComponent(text)}`;
  });

  constructor() {
    this.state.mobileSubtitle.set('Pack Barista · COGS et seuils');
    this.load();
    inject(DestroyRef).onDestroy(() => this.sub?.unsubscribe());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.sub?.unsubscribe();
    this.sub = this.api.get().subscribe({
      next: (s) => this.apply(s),
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, "Le stock n'a pas pu être chargé."));
      },
    });
  }

  private apply(s: StockOverview): void {
    this.stock.set(s);
    this.state.stock.set(s);
    this.loading.set(false);
  }

  protected tnd(v: number): string {
    return formatTnd(v);
  }

  protected num(v: number): string {
    return formatNumber(v);
  }

  /** Enregistre une cellule modifiée (au blur / Entrée). Valeur invalide → restaurée. */
  protected save(item: StockItem, field: StockField, input: HTMLInputElement): void {
    const raw = input.value.trim().replace(',', '.');
    const value = Number(raw);
    const valid =
      raw !== '' &&
      Number.isFinite(value) &&
      value >= 0 &&
      (field === 'unitCostTnd' || Number.isInteger(value));
    if (!valid) {
      input.value = String(item[field]);
      this.toast.error(
        field === 'unitCostTnd'
          ? 'Indique un coût positif en TND (ex. 21,5).'
          : 'Indique un nombre entier positif.',
      );
      return;
    }
    if (value === item[field]) return;
    const patch: StockItemPatch = { id: item.id, [field]: value };
    this.saving.set(`${item.id}:${field}`);
    this.api.patch([patch]).subscribe({
      next: (s) => {
        this.saving.set(null);
        this.apply(s);
      },
      error: (err) => {
        this.saving.set(null);
        input.value = String(item[field]);
        this.toast.error(apiErrorMessage(err, "La modification n'a pas été enregistrée. Réessaie."));
      },
    });
  }

  protected assemble(): void {
    const s = this.stock();
    if (!s || s.assemblablePacks <= 0 || this.assembling()) return;
    const n = s.assemblablePacks;
    if (!window.confirm(`Assembler ${n} packs ? Les pièces correspondantes seront décomptées du stock.`)) {
      return;
    }
    this.assembling.set(true);
    this.api.assemble(n).subscribe({
      next: (res) => {
        this.assembling.set(false);
        this.apply(res);
        this.toast.success(`${n} packs assemblés. Packs complets : ${res.completePacks}.`);
      },
      error: (err) => {
        this.assembling.set(false);
        this.toast.error(apiErrorMessage(err, "L'assemblage n'a pas pu être enregistré. Réessaie."));
      },
    });
  }

  protected alertAgentMissing(): void {
    this.toast.error(
      "Numéro WhatsApp de l'agent [À DÉFINIR] : renseigne agentWhatsappNumber dans l'environnement de l'admin.",
    );
  }
}
