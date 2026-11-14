import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { DOCUMENT, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable, firstValueFrom, forkJoin, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MediaApi } from '../../core/api/media.api';
import { ProductsApi } from '../../core/api/products.api';
import { StockApi } from '../../core/api/stock.api';
import { AppState } from '../../core/app-state';
import { apiErrorMessage, apiErrorStatus } from '../../core/errors';
import { formatNumber, formatTnd } from '../../core/format';
import {
  Hotspot,
  Media,
  PackItemInput,
  ProductAdmin,
  ProductInput,
  Savings,
  StockItem,
  StockItemPatch,
} from '../../core/models';
import {
  DEFAULT_SAVINGS,
  SLUG_PATTERN,
  defaultSku,
  monthlySavings,
  slugify,
  validationErrors,
} from '../../core/pack-utils';
import { ToastService } from '../../core/toast.service';
import { HasUnsavedChanges } from '../../core/unsaved-changes.guard';
import { Button } from '../../ui/button';
import { ErrorState } from '../../ui/error-state';
import { HotspotChange, HotspotEditor, HotspotPoint } from '../../ui/hotspot-editor';
import { Icon } from '../../ui/icon';
import { MediaDropzone } from '../../ui/media-dropzone';
import { PackStatus } from '../../ui/pack-status';
import { PackVisual } from '../../ui/pack-visual';
import { ShopCardPreview } from '../../ui/shop-card-preview';

export interface InfoDraft {
  name: string;
  slug: string;
  sku: string;
  badge: string;
  tagline: string;
  audience: string;
  description: string;
  /** Saisie brute (« 89 », « 89,5 »). */
  price: string;
  active: boolean;
  featured: boolean;
  savingsOn: boolean;
  savings: Savings;
}

export interface ItemDraft {
  /** Clé locale stable (pastilles, @for). */
  key: string;
  stockItemId: number;
  name: string;
  description: string;
  photo: Media | null;
  quantity: number;
  gift: boolean;
  hotspot: Hotspot | null;
}

export interface GalleryDraft {
  media: Media;
  alt: string;
}

type InfoField = keyof Omit<InfoDraft, 'savings' | 'active' | 'featured' | 'savingsOn'>;

const EMPTY_INFO: InfoDraft = {
  name: '',
  slug: '',
  sku: '',
  badge: '',
  tagline: '',
  audience: '',
  description: '',
  price: '',
  active: false,
  featured: false,
  savingsOn: false,
  savings: { ...DEFAULT_SAVINGS },
};

/** Ordre des champs pour amener le focus sur la première erreur. */
const FIELD_ORDER = ['name', 'slug', 'sku', 'badge', 'tagline', 'audience', 'description', 'priceTnd', 'active', 'savings'];

export function parsePrice(raw: string): number | null {
  const v = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!v || !/^\d+(\.\d+)?$/.test(v)) return null;
  return Number(v);
}

/** Validation locale, mêmes règles et messages que l'API (CONTRACT v2 › ProductInput). */
export function validateInfo(d: InfoDraft): Record<string, string> {
  const e: Record<string, string> = {};
  const name = d.name.trim();
  if (name.length < 3 || name.length > 80) e['name'] = 'Le nom doit faire entre 3 et 80 caractères.';
  if (d.slug.trim() && !SLUG_PATTERN.test(d.slug.trim())) {
    e['slug'] = 'Lien : lettres minuscules, chiffres et tirets uniquement.';
  }
  const tagline = d.tagline.trim();
  if (tagline.length < 5 || tagline.length > 160) {
    e['tagline'] = 'La promesse doit faire entre 5 et 160 caractères.';
  }
  const price = parsePrice(d.price);
  if (d.price.trim() === '') {
    // Sans prix : 0 = [À DÉFINIR], autorisé pour un brouillon (contrôle « actif » ci-dessous).
  } else if (price == null) {
    e['priceTnd'] = 'Indique un prix positif en TND (ex. 89 ou 89,5).';
  } else if (!/^\d+([.,]\d{1,3})?$/.test(d.price.trim().replace(/\s/g, ''))) {
    e['priceTnd'] = 'Le prix accepte 3 décimales au maximum.';
  }
  if (d.active && !(price != null && price > 0) && !e['priceTnd']) {
    e['priceTnd'] = "Fixe un prix avant d'activer ce pack.";
  }
  if (d.savingsOn) {
    const s = d.savings;
    const nums = [s.min, s.max, s.step, s.defaultValue, s.homeCostPerDay, s.daysPerMonth];
    if (
      !s.title.trim() ||
      !s.question.trim() ||
      nums.some((n) => !Number.isFinite(n) || n < 0) ||
      s.min >= s.max ||
      s.step <= 0 ||
      s.defaultValue < s.min ||
      s.defaultValue > s.max ||
      s.daysPerMonth < 1 ||
      s.daysPerMonth > 31
    ) {
      e['savings'] =
        'Vérifie le calculateur : titre et question remplis, min < max, valeur initiale entre les deux, pas > 0, 1 à 31 jours.';
    }
  }
  return e;
}

function toInfoDraft(p: ProductAdmin): InfoDraft {
  return {
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    badge: p.badge ?? '',
    tagline: p.tagline,
    audience: p.audience ?? '',
    description: p.description ?? '',
    price: p.priceTnd > 0 ? String(p.priceTnd).replace('.', ',') : '',
    active: p.active,
    featured: p.featured,
    savingsOn: !!p.savings,
    savings: p.savings ? { ...p.savings } : { ...DEFAULT_SAVINGS },
  };
}

export function toProductInput(d: InfoDraft): ProductInput {
  const opt = (v: string) => (v.trim() ? v.trim() : null);
  return {
    name: d.name.trim(),
    ...(d.slug.trim() ? { slug: d.slug.trim() } : {}),
    ...(d.sku.trim() ? { sku: d.sku.trim().toUpperCase() } : {}),
    badge: opt(d.badge),
    tagline: d.tagline.trim(),
    audience: opt(d.audience),
    description: opt(d.description),
    priceTnd: parsePrice(d.price) ?? 0,
    active: d.active,
    featured: d.featured,
    savings: d.savingsOn ? { ...d.savings, title: d.savings.title.trim(), question: d.savings.question.trim() } : null,
  };
}

let keySeq = 0;
const newKey = () => `it-${++keySeq}`;

/** /packs/new et /packs/:id — éditeur de pack (infos, photos, composition, points d'intérêt). */
@Component({
  selector: 'app-pack-editor-page',
  imports: [
    RouterLink,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    Button,
    ErrorState,
    Icon,
    MediaDropzone,
    HotspotEditor,
    PackStatus,
    PackVisual,
    ShopCardPreview,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
  templateUrl: './pack-editor-page.html',
})
export class PackEditorPage implements HasUnsavedChanges {
  private readonly productsApi = inject(ProductsApi);
  private readonly stockApi = inject(StockApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly state = inject(AppState);
  private readonly doc = inject(DOCUMENT);
  private readonly location = inject(Location);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Paramètre de route :id (absent sur /packs/new). */
  readonly id = input<string | undefined>(undefined);

  protected readonly shopUrl = environment.shopUrl.replace(/\/$/, '');

  // ---------- État serveur ----------
  protected readonly product = signal<ProductAdmin | null>(null);
  protected readonly stockItems = signal<StockItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  // ---------- Brouillon ----------
  protected readonly info = signal<InfoDraft>({ ...EMPTY_INFO, savings: { ...DEFAULT_SAVINGS } });
  protected readonly cover = signal<Media | null>(null);
  protected readonly gallery = signal<GalleryDraft[]>([]);
  protected readonly items = signal<ItemDraft[]>([]);
  protected readonly slugAuto = signal(true);
  private readonly baseline = signal<string>('');

  protected readonly errors = signal<Record<string, string>>({});
  protected readonly formError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly selectedHotspot = signal<string | null>(null);
  /** Annonce lecteur d'écran (réordonnancement de la galerie). */
  protected readonly announce = signal('');

  // Ajout d'un produit à la composition
  protected readonly pickId = signal<string>('');
  protected readonly creatingItem = signal(false);
  protected readonly newItem = signal({ name: '', description: '', cost: '' });
  protected readonly newItemError = signal<string | null>(null);
  protected readonly newItemSaving = signal(false);

  /** Route /packs/new (pilote le chargement). */
  private readonly isNewRoute = computed(() => this.id() == null || this.id() === 'new');
  /** Pack pas encore créé côté serveur (affichage). */
  protected readonly isNew = computed(() => this.product() == null);
  protected readonly numericId = computed(() => {
    const n = Number(this.id());
    return Number.isInteger(n) && n > 0 ? n : null;
  });

  private readonly snapshot = computed(() =>
    JSON.stringify({
      info: this.info(),
      cover: this.cover()?.id ?? null,
      gallery: this.gallery().map((g) => [g.media.id, g.alt.trim()]),
      items: this.items().map((i) => [i.stockItemId, i.quantity, i.gift, i.hotspot, i.description.trim(), i.photo?.id ?? null]),
    }),
  );
  protected readonly dirty = computed(() => !this.loading() && this.snapshot() !== this.baseline());

  protected readonly priceValue = computed(() => parsePrice(this.info().price));
  protected readonly slugPreview = computed(() => this.info().slug.trim() || slugify(this.info().name) || 'mon-pack');
  protected readonly skuPlaceholder = computed(() => defaultSku(this.slugPreview()) || 'PACK-…');
  protected readonly shopLink = computed(() => {
    const p = this.product();
    if (!p || !this.shopUrl) return null;
    return `${this.shopUrl}/packs/${p.slug}`;
  });

  protected readonly availableStock = computed(() => {
    const used = new Set(this.items().map((i) => i.stockItemId));
    return this.stockItems().filter((s) => !used.has(s.id));
  });

  protected readonly hotspotPoints = computed<HotspotPoint[]>(() =>
    this.items().map((i) => ({ key: i.key, label: i.name, hotspot: i.hotspot })),
  );

  protected readonly savingsExample = computed(() => {
    const d = this.info();
    if (!d.savingsOn) return null;
    const v = monthlySavings(d.savings);
    return Number.isFinite(v) ? formatTnd(Math.round(v)) : null;
  });

  /** Liste « prêt à publier » de l'aperçu. */
  protected readonly checklist = computed(() => {
    const d = this.info();
    const items = this.items();
    return [
      { label: 'Nom et promesse', ok: d.name.trim().length >= 3 && d.tagline.trim().length >= 5 },
      { label: 'Prix fixé', ok: (this.priceValue() ?? 0) > 0 },
      { label: 'Photo principale', ok: !!this.cover() },
      { label: 'Composition', ok: items.length > 0 },
      { label: "Points d'intérêt placés", ok: items.length > 0 && items.every((i) => !!i.hotspot) },
    ];
  });

  constructor() {
    effect(() => {
      const isNew = this.isNewRoute();
      const id = this.numericId();
      untracked(() => this.load(isNew, id));
    });
    effect(() => {
      const name = this.info().name;
      this.state.mobileSubtitle.set(name.trim() || 'Brouillon');
    });
    inject(DestroyRef).onDestroy(() => this.state.mobileSubtitle.set(''));
  }

  // ---------- Chargement ----------

  protected reload(): void {
    this.load(this.isNewRoute(), this.numericId());
  }

  private load(isNew: boolean, id: number | null): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.errors.set({});
    this.formError.set(null);
    if (!isNew && id == null) {
      this.loading.set(false);
      this.loadError.set("Ce pack n'existe pas. Reviens au catalogue pour le retrouver.");
      return;
    }
    const stock$ = this.stockApi.get();
    const product$: Observable<ProductAdmin | null> =
      isNew || id == null ? of(null) : this.productsApi.get(id);
    forkJoin({ stock: stock$, product: product$ }).subscribe({
      next: ({ stock, product }) => {
        this.stockItems.set(stock.items);
        this.apply(product);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(
          apiErrorStatus(err) === 404
            ? "Ce pack n'existe pas (ou a été supprimé)."
            : apiErrorMessage(err, "Le pack n'a pas pu être chargé. Vérifie ta connexion puis réessaie."),
        );
      },
    });
  }

  /** Remplace le brouillon par l'état serveur et le marque comme « enregistré ». */
  private apply(p: ProductAdmin | null): void {
    this.product.set(p);
    if (p) {
      this.info.set(toInfoDraft(p));
      this.cover.set(p.cover);
      this.gallery.set(p.gallery.map((m) => ({ media: m, alt: m.alt ?? '' })));
      this.items.set(
        p.items.map((it) => ({
          key: newKey(),
          stockItemId: it.stockItemId,
          name: it.name,
          description: it.description ?? '',
          photo: it.photo,
          quantity: it.quantity,
          gift: it.gift,
          hotspot: it.hotspot,
        })),
      );
      this.slugAuto.set(false);
    } else {
      this.info.set({ ...EMPTY_INFO, savings: { ...DEFAULT_SAVINGS } });
      this.cover.set(null);
      this.gallery.set([]);
      this.items.set([]);
      this.slugAuto.set(true);
    }
    this.baseline.set(this.snapshot());
  }

  hasUnsavedChanges(): boolean {
    return this.dirty() && !this.saving();
  }

  protected onBeforeUnload(e: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  // ---------- Infos ----------

  protected setField(field: InfoField, value: string): void {
    this.info.update((d) => {
      const next = { ...d, [field]: value };
      if (field === 'name' && this.slugAuto()) next.slug = slugify(value);
      return next;
    });
    if (field === 'slug') this.slugAuto.set(false);
    this.clearError(field === 'price' ? 'priceTnd' : field);
  }

  protected regenerateSlug(): void {
    this.slugAuto.set(true);
    this.info.update((d) => ({ ...d, slug: slugify(d.name) }));
    this.clearError('slug');
  }

  protected setFlag(field: 'active' | 'featured' | 'savingsOn', value: boolean): void {
    this.info.update((d) => ({ ...d, [field]: value }));
    if (field === 'active') this.clearError('priceTnd');
    if (field === 'savingsOn') this.clearError('savings');
  }

  protected setSavings(field: keyof Savings, raw: string): void {
    const value = field === 'title' || field === 'question' ? raw : Number(raw.replace(',', '.'));
    this.info.update((d) => ({ ...d, savings: { ...d.savings, [field]: value } }));
    this.clearError('savings');
  }

  private clearError(key: string): void {
    if (this.errors()[key]) {
      this.errors.update((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }
  }

  // ---------- Photos ----------

  protected onGalleryUploaded(m: Media): void {
    this.gallery.update((g) => [...g, { media: m, alt: m.alt ?? '' }]);
  }

  protected removeGallery(index: number): void {
    this.gallery.update((g) => g.filter((_, i) => i !== index));
  }

  protected setGalleryAlt(index: number, alt: string): void {
    this.gallery.update((g) => g.map((x, i) => (i === index ? { ...x, alt } : x)));
  }

  protected dropGallery(e: CdkDragDrop<GalleryDraft[]>): void {
    if (e.previousIndex === e.currentIndex) return;
    this.gallery.update((g) => {
      const next = [...g];
      moveItemInArray(next, e.previousIndex, e.currentIndex);
      return next;
    });
    this.announce.set(`Photo déplacée en position ${e.currentIndex + 1} sur ${this.gallery().length}.`);
  }

  protected moveGallery(e: KeyboardEvent, index: number): void {
    const delta = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 0;
    const to = index + delta;
    if (!delta || to < 0 || to >= this.gallery().length) return;
    e.preventDefault();
    const id = this.gallery()[index].media.id;
    this.gallery.update((g) => {
      const next = [...g];
      moveItemInArray(next, index, to);
      return next;
    });
    this.announce.set(`Photo déplacée en position ${to + 1} sur ${this.gallery().length}.`);
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>(`[data-gallery-handle="${id}"]`)?.focus(),
      { injector: this.injector },
    );
  }

  // ---------- Composition ----------

  protected addExisting(): void {
    const id = Number(this.pickId());
    const s = this.stockItems().find((x) => x.id === id);
    if (!s) return;
    this.items.update((list) => [...list, this.fromStock(s)]);
    this.pickId.set('');
  }

  private fromStock(s: StockItem): ItemDraft {
    return {
      key: newKey(),
      stockItemId: s.id,
      name: s.name,
      description: s.description ?? '',
      photo: s.photo,
      quantity: 1,
      gift: false,
      hotspot: null,
    };
  }

  protected setNewItem(field: 'name' | 'description' | 'cost', value: string): void {
    this.newItem.update((n) => ({ ...n, [field]: value }));
    this.newItemError.set(null);
  }

  /** Crée la pièce dans le stock (immédiatement) puis l'ajoute à la composition. */
  protected createItem(): void {
    const n = this.newItem();
    const name = n.name.trim();
    const cost = n.cost.trim() ? parsePrice(n.cost) : 0;
    if (name.length < 2) {
      this.newItemError.set('Donne un nom à la pièce (2 caractères min.).');
      return;
    }
    if (cost == null) {
      this.newItemError.set('Indique un coût positif en TND (ou laisse vide : [À DÉFINIR]).');
      return;
    }
    const before = new Set(this.stockItems().map((s) => s.id));
    this.newItemSaving.set(true);
    this.stockApi
      .createItem({ name, description: n.description.trim() || null, unitCostTnd: cost, quantity: 0, threshold: 0 })
      .subscribe({
        next: (stock) => {
          this.newItemSaving.set(false);
          this.stockItems.set(stock.items);
          const created =
            stock.items.filter((s) => !before.has(s.id)).sort((a, b) => b.id - a.id)[0] ??
            stock.items.find((s) => s.name === name);
          if (created) this.items.update((list) => [...list, this.fromStock(created)]);
          this.newItem.set({ name: '', description: '', cost: '' });
          this.creatingItem.set(false);
          this.toast.success(`Pièce « ${name} » créée dans le stock.`);
        },
        error: (err) => {
          this.newItemSaving.set(false);
          const v = validationErrors(err);
          this.newItemError.set(
            v ? Object.values(v)[0] : apiErrorMessage(err, "La pièce n'a pas pu être créée. Réessaie."),
          );
        },
      });
  }

  protected updateItem(key: string, patch: Partial<ItemDraft>): void {
    this.items.update((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  protected setQuantity(key: string, raw: string): void {
    const q = Math.round(Number(raw));
    this.updateItem(key, { quantity: Number.isFinite(q) && q >= 1 ? Math.min(q, 99) : 1 });
  }

  protected removeItem(key: string): void {
    this.items.update((list) => list.filter((i) => i.key !== key));
    if (this.selectedHotspot() === key) this.selectedHotspot.set(null);
  }

  protected onHotspot(c: HotspotChange): void {
    this.updateItem(c.key, { hotspot: c.hotspot });
  }

  protected stockLabel(s: StockItem): string {
    const cost = s.unitCostTnd > 0 ? formatTnd(s.unitCostTnd) : 'coût [À DÉFINIR]';
    return `${s.name} — ${formatNumber(s.quantity)} en stock · ${cost}`;
  }

  protected stockOf(id: number): StockItem | undefined {
    return this.stockItems().find((s) => s.id === id);
  }

  // ---------- Enregistrer ----------

  protected cancel(): void {
    void this.router.navigate(['/packs']);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.formError.set(null);
    const local = validateInfo(this.info());
    this.errors.set(local);
    if (Object.keys(local).length) {
      this.focusFirstError();
      return;
    }
    this.saving.set(true);
    const original = this.product();
    let saved: ProductAdmin;
    try {
      const body = toProductInput(this.info());
      saved = await firstValueFrom(
        original ? this.productsApi.update(original.id, body) : this.productsApi.create(body),
      );
      this.product.set(saved);
    } catch (err) {
      this.saving.set(false);
      const v = validationErrors(err);
      if (v) {
        this.errors.set(v);
        const unknown = Object.keys(v).filter((k) => !FIELD_ORDER.includes(k));
        if (unknown.length) this.formError.set(unknown.map((k) => v[k]).join(' '));
        this.focusFirstError();
      } else {
        this.formError.set(apiErrorMessage(err, "Le pack n'a pas pu être enregistré. Réessaie."));
      }
      return;
    }

    // Photos, composition et pièces : seulement ce qui a changé.
    const failures: string[] = [];
    const step = async <T>(label: string, run: () => Observable<T>): Promise<T | null> => {
      try {
        return await firstValueFrom(run());
      } catch (err) {
        const v = validationErrors(err);
        failures.push(`${label} (${v ? Object.values(v).join(' ') : apiErrorMessage(err, 'erreur')})`);
        return null;
      }
    };
    const id = saved.id;
    const coverId = this.cover()?.id ?? null;
    if (coverId !== (saved.cover?.id ?? null)) {
      await step('photo principale', () => this.productsApi.setCover(id, coverId));
    }
    const galleryIds = this.gallery().map((g) => g.media.id);
    if (JSON.stringify(galleryIds) !== JSON.stringify(saved.gallery.map((m) => m.id))) {
      await step('galerie', () => this.productsApi.setGallery(id, galleryIds));
    }
    for (const g of this.gallery()) {
      if (g.alt.trim() !== (g.media.alt ?? '')) {
        await step('texte alternatif', () => this.mediaApi.updateAlt(g.media.id, g.alt.trim()));
      }
    }
    const itemsInput: PackItemInput[] = this.items().map((i) => ({
      stockItemId: i.stockItemId,
      quantity: i.quantity,
      gift: i.gift,
      hotspot: i.hotspot,
    }));
    const savedItems: PackItemInput[] = saved.items.map((i) => ({
      stockItemId: i.stockItemId,
      quantity: i.quantity,
      gift: i.gift,
      hotspot: i.hotspot,
    }));
    if (JSON.stringify(itemsInput) !== JSON.stringify(savedItems)) {
      await step('composition', () => this.productsApi.setItems(id, itemsInput));
    }
    const patches: StockItemPatch[] = [];
    for (const i of this.items()) {
      const s = this.stockOf(i.stockItemId);
      const patch: StockItemPatch = { id: i.stockItemId };
      if (i.description.trim() !== (s?.description ?? '')) patch.description = i.description.trim() || null;
      if ((i.photo?.id ?? null) !== (s?.photo?.id ?? null)) patch.photoMediaId = i.photo?.id ?? null;
      if (Object.keys(patch).length > 1) patches.push(patch);
    }
    if (patches.length) {
      const stock = await step('produits (description / photo)', () => this.stockApi.patch(patches));
      if (stock) this.stockItems.set(stock.items);
    }

    const fresh = await step('rechargement', () => this.productsApi.get(id));
    this.saving.set(false);
    if (failures.length) {
      // Le pack existe : on garde le brouillon pour réessayer (PUT au prochain enregistrement).
      this.product.set(fresh ?? saved);
      this.formError.set(`Pack enregistré, mais certaines parties n'ont pas pu l'être : ${failures.join(' · ')}. Réessaie.`);
      // Nouvelle URL sans recharger l'écran (le brouillon est conservé).
      if (!original) this.location.replaceState(`/packs/${id}`);
      return;
    }
    this.apply(fresh ?? saved);
    this.toast.success(original ? 'Pack enregistré.' : 'Pack créé.');
    if (!original) void this.router.navigate(['/packs', id], { replaceUrl: true });
  }

  protected async remove(): Promise<void> {
    const p = this.product();
    if (!p || this.deleting()) return;
    if (!window.confirm(`Supprimer « ${p.name} » ? Cette action est définitive.`)) return;
    this.deleting.set(true);
    try {
      await firstValueFrom(this.productsApi.delete(p.id));
      this.baseline.set(this.snapshot());
      this.toast.success(`« ${p.name} » supprimé.`);
      void this.router.navigate(['/packs']);
    } catch (err) {
      this.toast.error(apiErrorMessage(err, "Le pack n'a pas pu être supprimé. Réessaie."));
    } finally {
      this.deleting.set(false);
    }
  }

  private focusFirstError(): void {
    const first = FIELD_ORDER.find((k) => this.errors()[k]);
    afterNextRender(
      () => {
        const el = first
          ? this.doc.getElementById(`pk-${first}`)
          : this.host.nativeElement.querySelector<HTMLElement>('[data-form-error]');
        el?.focus();
        const reduce = this.doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        el?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      },
      { injector: this.injector },
    );
  }
}
