import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StockApi } from '../../core/api/stock.api';
import { AppState } from '../../core/app-state';
import { apiErrorMessage } from '../../core/errors';
import { formatNumber, formatPct, formatTnd } from '../../core/format';
import { Media, StockItem, StockItemPatch, StockOverview, StockPack } from '../../core/models';
import { validationErrors } from '../../core/pack-utils';
import { ToastService } from '../../core/toast.service';
import { Button } from '../../ui/button';
import { DemoBadge } from '../../ui/demo-badge';
import { ErrorState } from '../../ui/error-state';
import { Icon } from '../../ui/icon';
import { MediaDropzone } from '../../ui/media-dropzone';
import { PackStatus } from '../../ui/pack-status';
import { PackVisual } from '../../ui/pack-visual';

export type StockField = 'unitCostTnd' | 'quantity' | 'threshold';

interface PieceForm {
  id: number | null;
  name: string;
  description: string;
  photo: Media | null;
  cost: string;
  quantity: string;
  threshold: string;
}

const EMPTY_PIECE: PieceForm = {
  id: null,
  name: '',
  description: '',
  photo: null,
  cost: '',
  quantity: '0',
  threshold: '5',
};

/** /stock — stock v2 : packs (complets, assemblables, seuil, marge) + pièces partagées. */
@Component({
  selector: 'app-stock-page',
  imports: [RouterLink, Button, DemoBadge, ErrorState, Icon, MediaDropzone, PackStatus, PackVisual],
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
  /** Pack en cours d'assemblage (productId). */
  protected readonly assembling = signal<number | null>(null);
  /** Nombre à assembler par pack (saisie). */
  protected readonly assembleQty = signal<Record<number, number>>({});
  /** Cellule en cours d'enregistrement : `${id}:${field}`. */
  protected readonly saving = signal<string | null>(null);
  protected readonly deletingId = signal<number | null>(null);

  // Fenêtre « pièce »
  protected readonly piece = signal<PieceForm | null>(null);
  protected readonly pieceErrors = signal<Record<string, string>>({});
  protected readonly pieceSaving = signal(false);
  private readonly dlg = viewChild<ElementRef<HTMLDialogElement>>('pieceDlg');
  private sub?: Subscription;

  protected readonly agentNumber = environment.agentWhatsappNumber.replace(/\D/g, '');

  protected readonly alertPacks = computed(() =>
    (this.stock()?.packs ?? []).filter((p) => p.active && p.alert),
  );

  protected readonly totals = computed(() => {
    const s = this.stock();
    if (!s) return null;
    const active = s.packs.filter((p) => p.active);
    return {
      complete: formatNumber(active.reduce((n, p) => n + p.completePacks, 0)),
      assemblable: formatNumber(active.reduce((n, p) => n + p.assemblablePacks, 0)),
      pieces: formatNumber(s.items.length),
      low: s.items.filter((i) => i.status === 'LOW').length,
      valueNum: formatNumber(s.items.reduce((n, i) => n + i.unitCostTnd * i.quantity, 0)),
    };
  });

  protected readonly alertWhatsappUrl = computed(() => {
    const packs = this.alertPacks();
    if (!this.agentNumber || packs.length === 0) return null;
    const lines = packs
      .map((p) => `• ${p.name} : ${p.completePacks} complets (seuil ${p.packThreshold}), ${p.assemblablePacks} assemblables`)
      .join('\n');
    const text = `Stock bas SHIFT CART :\n${lines}`;
    return `https://wa.me/${this.agentNumber}?text=${encodeURIComponent(text)}`;
  });

  constructor() {
    this.state.mobileSubtitle.set('Packs, pièces et marges');
    this.load();
    effect(() => {
      const el = this.dlg()?.nativeElement;
      if (!el) return;
      if (this.piece()) {
        if (!el.open) {
          if (typeof el.showModal === 'function') el.showModal();
          else el.setAttribute('open', '');
        }
      } else if (el.open) {
        el.close();
      }
    });
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

  protected pct(v: number): string {
    return formatPct(v, 0);
  }

  protected gauge(p: StockPack): number {
    return Math.max(0, Math.min(100, p.marginPct));
  }

  /** Pièce qui limite l'assemblage d'un pack. */
  protected limiting(p: StockPack): StockItem | null {
    const items = (this.stock()?.items ?? []).filter((i) => i.usedIn.some((u) => u.productId === p.productId));
    let min: StockItem | null = null;
    let minCount = Infinity;
    for (const it of items) {
      const per = it.usedIn.find((u) => u.productId === p.productId)?.perPack ?? 1;
      const count = per > 0 ? Math.floor(it.quantity / per) : Infinity;
      if (count < minCount) {
        min = it;
        minCount = count;
      }
    }
    return min;
  }

  // ---------- Édition en ligne ----------

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

  // ---------- Assemblage ----------

  protected qtyFor(p: StockPack): number {
    return this.assembleQty()[p.productId] ?? Math.max(0, Math.min(p.assemblablePacks, Math.max(p.packThreshold - p.completePacks, 1)));
  }

  protected setQty(p: StockPack, raw: string): void {
    const n = Math.floor(Number(raw));
    this.assembleQty.update((q) => ({ ...q, [p.productId]: Number.isFinite(n) ? Math.max(0, n) : 0 }));
  }

  protected assemble(p: StockPack): void {
    const n = this.qtyFor(p);
    if (n <= 0 || n > p.assemblablePacks || this.assembling() !== null) {
      if (n > p.assemblablePacks) this.toast.error(`Pas assez de pièces : ${p.assemblablePacks} packs assemblables au maximum.`);
      return;
    }
    if (!window.confirm(`Assembler ${n} « ${p.name} » ? Les pièces correspondantes seront décomptées du stock.`)) return;
    this.assembling.set(p.productId);
    this.api.assemble(p.productId, n).subscribe({
      next: (res) => {
        this.assembling.set(null);
        this.assembleQty.update((q) => {
          const next = { ...q };
          delete next[p.productId];
          return next;
        });
        this.apply(res);
        const after = res.packs.find((x) => x.productId === p.productId)?.completePacks;
        this.toast.success(`${n} packs assemblés.${after != null ? ` Packs complets : ${after}.` : ''}`);
      },
      error: (err) => {
        this.assembling.set(null);
        this.toast.error(apiErrorMessage(err, "L'assemblage n'a pas pu être enregistré. Réessaie."));
      },
    });
  }

  // ---------- Pièces : créer / modifier / supprimer ----------

  protected openCreate(): void {
    this.pieceErrors.set({});
    this.piece.set({ ...EMPTY_PIECE });
  }

  protected openEdit(it: StockItem): void {
    this.pieceErrors.set({});
    this.piece.set({
      id: it.id,
      name: it.name,
      description: it.description ?? '',
      photo: it.photo,
      cost: String(it.unitCostTnd).replace('.', ','),
      quantity: String(it.quantity),
      threshold: String(it.threshold),
    });
  }

  protected setPiece(field: keyof PieceForm, value: string | Media | null): void {
    this.piece.update((p) => (p ? { ...p, [field]: value } : p));
    if (this.pieceErrors()[field]) {
      this.pieceErrors.update((e) => {
        const next = { ...e };
        delete next[field];
        return next;
      });
    }
  }

  protected closePiece(): void {
    if (!this.pieceSaving()) this.piece.set(null);
  }

  protected onDialogCancel(e: Event): void {
    e.preventDefault();
    this.closePiece();
  }

  protected submitPiece(e: Event): void {
    e.preventDefault();
    const p = this.piece();
    if (!p || this.pieceSaving()) return;
    const errors: Record<string, string> = {};
    const name = p.name.trim();
    const cost = Number(p.cost.trim().replace(',', '.') || '0');
    const quantity = Number(p.quantity.trim());
    const threshold = Number(p.threshold.trim());
    if (name.length < 2) errors['name'] = 'Donne un nom à la pièce (2 caractères min.).';
    if (!Number.isFinite(cost) || cost < 0) errors['cost'] = 'Indique un coût positif en TND (ex. 21,5).';
    if (!Number.isInteger(quantity) || quantity < 0) errors['quantity'] = 'Indique un nombre entier positif.';
    if (!Number.isInteger(threshold) || threshold < 0) errors['threshold'] = 'Indique un nombre entier positif.';
    this.pieceErrors.set(errors);
    if (Object.keys(errors).length) return;

    const description = p.description.trim() || null;
    const req =
      p.id == null
        ? this.api.createItem({ name, description, photoMediaId: p.photo?.id ?? null, unitCostTnd: cost, quantity, threshold })
        : this.api.patch([
            { id: p.id, name, description, photoMediaId: p.photo?.id ?? null, unitCostTnd: cost, quantity, threshold },
          ]);
    this.pieceSaving.set(true);
    req.subscribe({
      next: (s) => {
        this.pieceSaving.set(false);
        this.apply(s);
        this.piece.set(null);
        this.toast.success(p.id == null ? `Pièce « ${name} » créée.` : `Pièce « ${name} » enregistrée.`);
      },
      error: (err) => {
        this.pieceSaving.set(false);
        const v = validationErrors(err);
        if (v) {
          this.pieceErrors.set({
            ...v,
            ...(v['unitCostTnd'] ? { cost: v['unitCostTnd'] } : {}),
            ...(v['photoMediaId'] ? { photo: v['photoMediaId'] } : {}),
          });
        } else {
          this.pieceErrors.set({ form: apiErrorMessage(err, "La pièce n'a pas pu être enregistrée. Réessaie.") });
        }
      },
    });
  }

  protected remove(it: StockItem): void {
    if (this.deletingId() !== null) return;
    if (it.usedIn.length) {
      this.toast.error(`« ${it.name} » est utilisée dans ${it.usedIn.map((u) => u.name).join(', ')} : retire-la d'abord du pack.`);
      return;
    }
    if (!window.confirm(`Supprimer la pièce « ${it.name} » du stock ?`)) return;
    this.deletingId.set(it.id);
    this.api.deleteItem(it.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toast.success(`Pièce « ${it.name} » supprimée.`);
        this.load();
      },
      error: (err) => {
        this.deletingId.set(null);
        this.toast.error(apiErrorMessage(err, "La pièce n'a pas pu être supprimée. Réessaie."));
      },
    });
  }

  protected alertAgentMissing(): void {
    this.toast.error(
      "Numéro WhatsApp de l'agent [À DÉFINIR] : renseigne agentWhatsappNumber dans l'environnement de l'admin.",
    );
  }
}
