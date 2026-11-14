import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessagesApi } from '../../core/api/messages.api';
import { OrdersApi } from '../../core/api/orders.api';
import { ProductsApi } from '../../core/api/products.api';
import { StockApi } from '../../core/api/stock.api';
import { AppState } from '../../core/app-state';
import { DeliverySlipService } from '../../core/delivery-slip.service';
import { apiErrorMessage } from '../../core/errors';
import {
  firstName,
  formatDateTime,
  formatTnd,
  receivedAge,
  refNumber,
} from '../../core/format';
import {
  ApiOrderStatus,
  MessageTone,
  OrderDetail,
  OrderEvent,
  OrderMessage,
  StatusUpdateRequest,
} from '../../core/models';
import {
  STATUS_META,
  TRANSITION_ACTION,
  carrierLabel,
  toApiStatus,
  toUiStatus,
} from '../../core/status';
import { ToastService } from '../../core/toast.service';
import { Button } from '../../ui/button';
import { ErrorState } from '../../ui/error-state';
import { Icon, IconName } from '../../ui/icon';
import { PackVisual } from '../../ui/pack-visual';
import { ShipDialog, ShipInfo } from '../../ui/ship-dialog';
import { StatusBadge } from '../../ui/status-badge';

const TONES: { value: MessageTone; label: string }[] = [
  { value: 'amical', label: 'Amical' },
  { value: 'direct', label: 'Direct' },
  { value: 'relance', label: 'Relance' },
];

/** Lien Google Maps de recherche pour une adresse (ouvert seulement depuis l'admin). */
export function mapsSearchUrl(address: string, governorate?: string | null): string {
  const addr = address.trim();
  const gov = governorate?.trim();
  const withGov = gov && !addr.toLowerCase().includes(gov.toLowerCase()) ? `${addr}, ${gov}` : addr;
  const query = /tunisi/i.test(withGov) ? withGov : `${withGov}, Tunisie`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const MESSAGE_STATUS: Record<string, { label: string; icon: IconName; cls: string }> = {
  SENT: { label: 'Envoyé', icon: 'check', cls: 'bg-success-soft text-success' },
  SIMULATED: { label: 'Simulé', icon: 'clock', cls: 'bg-info-soft text-info' },
  FAILED: { label: 'Échec', icon: 'alert', cls: 'bg-danger-soft text-danger' },
};

const SEND_FEEDBACK: Record<string, string> = {
  SENT: 'Message envoyé sur WhatsApp.',
  SIMULATED:
    "WhatsApp n'est pas encore configuré : envoi simulé, le message est enregistré dans l'historique.",
  FAILED: "L'envoi a échoué. Réessaie ou copie le message dans WhatsApp Business.",
};

/** Ordre d'affichage des actions de statut : la principale (dark) à droite. */
const ACTION_ORDER: ApiOrderStatus[] = ['CANCELLED', 'PENDING', 'RETURNED', 'NEW', 'DELIVERED', 'SHIPPED', 'CONFIRMED'];

/** /commandes/:id — C2 commande + message WhatsApp IA. */
@Component({
  selector: 'app-order-detail-page',
  imports: [RouterLink, Button, Icon, StatusBadge, ErrorState, ShipDialog, PackVisual],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './order-detail-page.html',
})
export class OrderDetailPage {
  private readonly ordersApi = inject(OrdersApi);
  private readonly messagesApi = inject(MessagesApi);
  private readonly productsApi = inject(ProductsApi);
  private readonly stockApi = inject(StockApi);
  private readonly slip = inject(DeliverySlipService);
  private readonly toast = inject(ToastService);
  private readonly state = inject(AppState);

  /** Paramètre de route :id. */
  readonly id = input.required<string>();
  /** ?tone=relance présélectionne le ton. */
  readonly tone = input<string | undefined>(undefined);

  protected readonly tones = TONES;
  protected readonly order = signal<OrderDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly selectedTone = signal<MessageTone>('amical');
  protected readonly body = signal('');
  protected readonly generating = signal(false);
  protected readonly generateError = signal<string | null>(null);
  protected readonly sending = signal(false);
  protected readonly sendFeedback = signal<{ status: string; text: string } | null>(null);
  protected readonly copied = signal(false);
  protected readonly addressCopied = signal(false);
  /** Contenu du pack (« Moka · Thermos · Café offert »), chargé depuis le pack. */
  protected readonly packContents = signal('');

  protected readonly statusPending = signal<ApiOrderStatus | null>(null);
  protected readonly shipOpen = signal(false);

  private readonly now = signal(Date.now());
  private loadSub?: Subscription;
  private genSub?: Subscription;
  private copyTimer?: ReturnType<typeof setTimeout>;
  private addressTimer?: ReturnType<typeof setTimeout>;
  private productSub?: Subscription;

  protected readonly numericId = computed(() => {
    const n = Number(this.id());
    return Number.isInteger(n) && n > 0 ? n : null;
  });

  protected readonly view = computed(() => {
    const o = this.order();
    if (!o) return null;
    return {
      num: refNumber(o.ref),
      status: toUiStatus(o.status),
      age: receivedAge(o.createdAt, this.now()),
      amount: formatTnd(o.amountTnd),
      first: firstName(o.customerName),
      contents: this.packContents(),
      address: o.address?.trim() || null,
      mapsUrl: o.address?.trim() ? mapsSearchUrl(o.address, o.governorate) : null,
      carrier: o.carrier
        ? `${carrierLabel(o.carrier)}${o.trackingNumber ? ' · ' + o.trackingNumber : ''}`
        : "Yalidine (à l'expédition)",
      canPrint: o.status === 'CONFIRMED' || o.status === 'SHIPPED',
    };
  });

  protected readonly actions = computed(() => {
    const o = this.order();
    if (!o) return [];
    return [...o.allowedTransitions]
      .sort((a, b) => ACTION_ORDER.indexOf(a) - ACTION_ORDER.indexOf(b))
      .map((status) => ({ status, ...TRANSITION_ACTION[status] }));
  });

  /** Historique : événements + messages, du plus récent au plus ancien. */
  protected readonly timeline = computed(() => {
    const o = this.order();
    if (!o) return [];
    const events = o.events.map((e) => ({ kind: 'event' as const, at: e.createdAt, event: e }));
    const messages = o.messages.map((m) => ({ kind: 'message' as const, at: m.createdAt, message: m }));
    return [...events, ...messages].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  });

  constructor() {
    effect(() => {
      const id = this.numericId();
      untracked(() => this.load(id));
    });
    effect(() => {
      const t = this.tone();
      if (t === 'amical' || t === 'direct' || t === 'relance') {
        untracked(() => this.selectedTone.set(t));
      }
    });
    const tick = setInterval(() => this.now.set(Date.now()), 60_000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(tick);
      clearTimeout(this.copyTimer);
      clearTimeout(this.addressTimer);
      this.loadSub?.unsubscribe();
      this.productSub?.unsubscribe();
      this.genSub?.unsubscribe();
    });
  }

  // ---------- Chargement ----------

  protected reload(): void {
    this.load(this.numericId());
  }

  private load(id: number | null): void {
    this.loadSub?.unsubscribe();
    this.order.set(null);
    this.sendFeedback.set(null);
    if (id == null) {
      this.loading.set(false);
      this.error.set("Cette commande n'existe pas. Reviens au tableau de bord pour la retrouver.");
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.loadSub = this.ordersApi.get(id).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
        this.now.set(Date.now());
        this.loadPackContents(o.productId);
        if (!this.tone() && o.status === 'PENDING') this.selectedTone.set('relance');
        // Génération automatique (appel LLM) seulement pour une commande à confirmer ;
        // pour les autres statuts, l'agent clique sur « Générer ».
        this.body.set('');
        if (o.status === 'NEW' || o.status === 'PENDING') this.generate();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          apiErrorMessage(err, "La commande n'a pas pu être chargée. Vérifie ta connexion puis réessaie."),
        );
      },
    });
  }

  private loadPackContents(productId: number | null | undefined): void {
    this.productSub?.unsubscribe();
    this.packContents.set('');
    if (productId == null) return;
    this.productSub = this.productsApi.get(productId).subscribe({
      next: (p) =>
        this.packContents.set(
          p.items.map((i) => (i.gift ? `${i.name} (offert)` : i.quantity > 1 ? `${i.name} × ${i.quantity}` : i.name)).join(' · '),
        ),
      error: () => undefined,
    });
  }

  /** Copie l'adresse exacte (pour le transporteur / WhatsApp). */
  protected async copyAddress(): Promise<void> {
    const address = this.order()?.address?.trim();
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      this.addressCopied.set(true);
      clearTimeout(this.addressTimer);
      this.addressTimer = setTimeout(() => this.addressCopied.set(false), 1800);
    } catch {
      this.toast.error("Copie impossible : sélectionne l'adresse et copie-la à la main.");
    }
  }

  // ---------- Message IA ----------

  protected pickTone(tone: MessageTone): void {
    if (tone === this.selectedTone() && this.body()) return;
    this.selectedTone.set(tone);
    this.generate();
  }

  protected generate(): void {
    const o = this.order();
    if (!o) return;
    this.genSub?.unsubscribe();
    this.generating.set(true);
    this.generateError.set(null);
    this.sendFeedback.set(null);
    this.genSub = this.messagesApi.generate(o.id, this.selectedTone()).subscribe({
      next: (res) => {
        this.body.set(res.body);
        this.generating.set(false);
      },
      error: (err) => {
        this.generating.set(false);
        this.generateError.set(
          apiErrorMessage(err, "Le message n'a pas pu être généré. Réessaie ou écris-le toi-même."),
        );
      },
    });
  }

  protected async copy(): Promise<void> {
    const text = this.body().trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copied.set(false), 1800);
    } catch {
      this.toast.error('Copie impossible : sélectionne le texte et copie-le à la main.');
    }
  }

  protected send(): void {
    const o = this.order();
    const text = this.body().trim();
    if (!o || !text || this.sending()) return;
    this.sending.set(true);
    this.sendFeedback.set(null);
    this.messagesApi.send(o.id, text).subscribe({
      next: (msg) => {
        this.sending.set(false);
        this.sendFeedback.set({
          status: msg.status,
          text: SEND_FEEDBACK[msg.status] ?? 'Message enregistré.',
        });
        this.order.update((cur) => (cur ? { ...cur, messages: [...cur.messages, msg] } : cur));
      },
      error: (err) => {
        this.sending.set(false);
        this.sendFeedback.set({
          status: 'FAILED',
          text: apiErrorMessage(err, SEND_FEEDBACK['FAILED']),
        });
      },
    });
  }

  // ---------- Statut ----------

  protected requestStatus(status: ApiOrderStatus): void {
    const o = this.order();
    if (!o || this.statusPending()) return;
    if (status === 'SHIPPED') {
      this.shipOpen.set(true);
      return;
    }
    if (
      status === 'CANCELLED' &&
      !window.confirm(`Annuler la commande #${refNumber(o.ref)} ? Le client ne sera pas livré.`)
    ) {
      return;
    }
    this.updateStatus({ status });
  }

  protected onShip(info: ShipInfo): void {
    this.shipOpen.set(false);
    this.updateStatus({ status: 'SHIPPED', ...info });
  }

  private updateStatus(req: StatusUpdateRequest): void {
    const o = this.order();
    if (!o) return;
    this.statusPending.set(req.status);
    this.ordersApi.updateStatus(o.id, req).subscribe({
      next: (updated) => {
        this.statusPending.set(null);
        this.order.set(updated);
        this.toast.success(
          `#${refNumber(updated.ref)} : ${STATUS_META[toUiStatus(updated.status)].label.toLowerCase()}.`,
        );
        if (req.status === toApiStatus('shipped')) {
          this.stockApi.get().subscribe({ next: (s) => this.state.stock.set(s), error: () => undefined });
        }
      },
      error: (err) => {
        this.statusPending.set(null);
        this.toast.error(apiErrorMessage(err, "Le statut n'a pas pu être changé. Réessaie."));
      },
    });
  }

  protected print(): void {
    const o = this.order();
    if (o) void this.slip.open(o.id, o.ref);
  }

  // ---------- Affichage ----------

  protected eventTitle(e: OrderEvent): string {
    if (!e.fromStatus) return 'Commande reçue';
    return `${STATUS_META[toUiStatus(e.fromStatus)].label} → ${STATUS_META[toUiStatus(e.toStatus)].label}`;
  }

  protected eventStatus(e: OrderEvent) {
    return toUiStatus(e.toStatus);
  }

  protected actorLabel(actor: string): string {
    if (actor === 'customer') return 'Client';
    if (actor === 'system') return 'Automatique';
    if (actor.startsWith('agent')) return 'Équipe';
    return actor;
  }

  protected messageStatus(m: OrderMessage) {
    if (m.direction === 'IN') {
      return { label: 'Reçu', icon: 'whatsapp' as IconName, cls: 'bg-surface-sunken text-ink' };
    }
    return this.sendStatusStyle(m.status);
  }

  protected sendStatusStyle(status: string): { label: string; icon: IconName; cls: string } {
    return (
      MESSAGE_STATUS[status] ?? { label: status, icon: 'clock', cls: 'bg-surface-sunken text-ink-muted' }
    );
  }

  protected toneLabel(tone: MessageTone | null): string {
    return TONES.find((t) => t.value === tone)?.label ?? '';
  }

  protected dateTime(iso: string | null): string {
    return formatDateTime(iso);
  }
}
