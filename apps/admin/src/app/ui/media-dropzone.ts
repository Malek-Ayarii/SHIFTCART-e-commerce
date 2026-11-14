import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { MediaApi } from '../core/api/media.api';
import { apiErrorMessage } from '../core/errors';
import { Media } from '../core/models';
import { ACCEPT_ATTR, validateImageFile, validationErrors } from '../core/pack-utils';
import { Icon } from './icon';
import { PackVisual } from './pack-visual';

export type DropzoneVariant = 'cover' | 'tile' | 'add';

interface UploadState {
  id: number;
  name: string;
  percent: number;
}

let seq = 0;

/**
 * Zone de dépôt de photo : glisser un fichier ou cliquer, aperçu, remplacer, retirer,
 * barre de progression et message d'erreur clair. JPEG/PNG/WebP ≤ 8 Mo (vérifié avant l'envoi).
 * - `cover` : grande zone (photo principale) ;
 * - `tile` : vignette carrée (photo d'un produit / d'une pièce) ;
 * - `add` : tuile d'ajout multiple (galerie) — émet `uploaded` pour chaque photo.
 */
@Component({
  selector: 'sc-media-dropzone',
  imports: [Icon, PackVisual],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div
      class="relative rounded-md transition-[box-shadow,background-color] duration-120 motion-reduce:transition-none"
      [class]="frameClass()"
      (dragenter)="onDragOver($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      @if (media() && variant() !== 'add') {
        <sc-pack-visual class="absolute inset-0 rounded-md" [media]="media()" [name]="label()" />
        <div
          class="absolute inset-x-0 bottom-0 flex bg-linear-to-t from-scrim to-transparent rounded-b-md"
          [class]="variant() === 'tile' ? 'justify-between p-1' : 'flex-wrap justify-end gap-1.5 p-2'"
        >
          <button
            type="button"
            class="inline-flex items-center gap-1.5 h-9 rounded-sm border-0 bg-surface-raised text-ink text-sm font-bold cursor-pointer shadow-card hover:bg-surface-sunken relative before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']"
            [class]="variant() === 'tile' ? 'w-9 justify-center px-0' : 'px-3'"
            [attr.aria-label]="'Remplacer la photo : ' + label()"
            (click)="pick()"
          >
            <sc-icon name="refresh" [size]="16" />
            @if (variant() !== 'tile') {
              <span>Remplacer</span>
            }
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 h-9 rounded-sm border-0 bg-surface-raised text-danger text-sm font-bold cursor-pointer shadow-card hover:bg-danger-soft relative before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']"
            [class]="variant() === 'tile' ? 'w-9 justify-center px-0' : 'px-3'"
            [attr.aria-label]="'Retirer la photo : ' + label()"
            (click)="removed.emit()"
          >
            <sc-icon name="trash" [size]="16" />
            @if (variant() !== 'tile') {
              <span>Retirer</span>
            }
          </button>
        </div>
      } @else {
        <button
          type="button"
          class="absolute inset-0 w-full flex flex-col items-center justify-center gap-2 p-3 rounded-md border-0 bg-transparent text-ink cursor-pointer text-center"
          [attr.aria-label]="(variant() === 'add' ? 'Ajouter des photos : ' : 'Choisir une photo : ') + label()"
          [attr.aria-describedby]="hintId"
          (click)="pick()"
        >
          <span
            class="grid place-items-center rounded-pill bg-surface-raised text-ink shadow-card"
            [class]="variant() === 'tile' ? 'size-8' : 'size-12'"
          >
            <sc-icon [name]="variant() === 'add' ? 'imagePlus' : 'upload'" [size]="variant() === 'tile' ? 16 : 22" />
          </span>
          @if (variant() !== 'tile') {
            <span class="text-sm font-bold">
              {{ dragging() ? 'Dépose ici' : variant() === 'add' ? 'Ajouter des photos' : 'Glisse une photo ici' }}
            </span>
            <span class="text-xs font-semibold text-ink-muted">ou clique pour choisir</span>
          }
        </button>
      }

      @if (uploads().length) {
        <div class="absolute inset-0 rounded-md bg-surface-raised/90 flex flex-col justify-center gap-2 p-3" aria-live="polite">
          @for (u of uploads(); track u.id) {
            <div class="flex flex-col gap-1 min-w-0">
              @if (variant() !== 'tile') {
                <span class="text-xs font-bold truncate">Envoi de {{ u.name }}… {{ u.percent }} %</span>
              }
              <div
                class="h-1.5 rounded-pill bg-surface-sunken overflow-hidden"
                role="progressbar"
                [attr.aria-label]="'Envoi de ' + u.name"
                aria-valuemin="0"
                aria-valuemax="100"
                [attr.aria-valuenow]="u.percent"
              >
                <div class="h-full bg-ink transition-[width] duration-120" [style.width.%]="u.percent"></div>
              </div>
            </div>
          }
        </div>
      }
      <input
        #file
        type="file"
        class="sc-sr"
        tabindex="-1"
        aria-hidden="true"
        [accept]="accept"
        [multiple]="variant() === 'add'"
        (change)="onPicked(file)"
      />
    </div>
    @if (variant() !== 'tile') {
      <p [id]="hintId" class="m-0 mt-1.5 text-xs font-semibold text-ink-muted">JPEG, PNG ou WebP · 8 Mo max</p>
    } @else {
      <span [id]="hintId" class="sc-sr">JPEG, PNG ou WebP, 8 Mo max</span>
    }
    @if (error(); as e) {
      <p role="alert" class="m-0 mt-1.5 flex items-start gap-1.5 text-xs font-bold text-danger">
        <sc-icon name="alert" [size]="14" />{{ e }}
      </p>
    }
  `,
})
export class MediaDropzone {
  private readonly api = inject(MediaApi);

  readonly media = input<Media | null>(null);
  readonly label = input('Photo');
  readonly variant = input<DropzoneVariant>('cover');
  /** Texte alternatif envoyé avec la photo. */
  readonly alt = input<string | undefined>(undefined);

  readonly uploaded = output<Media>();
  readonly removed = output<void>();

  protected readonly accept = ACCEPT_ATTR;
  protected readonly hintId = `sc-dz-hint-${++seq}`;
  protected readonly dragging = signal(false);
  protected readonly uploads = signal<UploadState[]>([]);
  protected readonly error = signal<string | null>(null);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('file');
  private readonly subs = new Set<Subscription>();
  private uploadSeq = 0;

  protected readonly frameClass = computed(() => {
    const v = this.variant();
    const size =
      v === 'cover' ? 'aspect-[16/10] w-full' : v === 'tile' ? 'size-20' : 'aspect-square w-full';
    const filled = !!this.media() && v !== 'add';
    const state = this.dragging()
      ? 'bg-orange-soft shadow-[inset_0_0_0_2px_var(--orange)]'
      : this.error()
        ? 'bg-surface-sunken shadow-[inset_0_0_0_1.5px_var(--danger)]'
        : filled
          ? 'bg-surface-sunken'
          : 'bg-surface-sunken shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:bg-surface';
    return `${size} ${state}`;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.subs.forEach((s) => s.unsubscribe()));
  }

  /** Ouvre le sélecteur de fichiers. */
  pick(): void {
    this.fileInput().nativeElement.click();
  }

  protected onPicked(input: HTMLInputElement): void {
    this.handle(Array.from(input.files ?? []));
    input.value = '';
  }

  protected onDragOver(e: DragEvent): void {
    if (!e.dataTransfer?.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    this.dragging.set(true);
  }

  protected onDragLeave(e: DragEvent): void {
    const to = e.relatedTarget as Node | null;
    if (to && (e.currentTarget as HTMLElement).contains(to)) return;
    this.dragging.set(false);
  }

  protected onDrop(e: DragEvent): void {
    if (!e.dataTransfer?.files.length) return;
    e.preventDefault();
    this.dragging.set(false);
    this.handle(Array.from(e.dataTransfer.files));
  }

  /** Valide puis envoie les fichiers (un seul hors mode `add`). */
  handle(files: File[]): void {
    const list = this.variant() === 'add' ? files : files.slice(0, 1);
    if (!list.length) return;
    this.error.set(null);
    for (const file of list) {
      const invalid = validateImageFile(file);
      if (invalid) {
        this.error.set(list.length > 1 ? `${file.name} : ${invalid}` : invalid);
        continue;
      }
      this.send(file);
    }
  }

  private send(file: File): void {
    const id = ++this.uploadSeq;
    this.uploads.update((u) => [...u, { id, name: file.name, percent: 0 }]);
    const done = () => this.uploads.update((u) => u.filter((x) => x.id !== id));
    const sub = this.api.upload(file, this.alt()).subscribe({
      next: (evt) => {
        if (evt.kind === 'progress') {
          this.uploads.update((u) => u.map((x) => (x.id === id ? { ...x, percent: evt.percent } : x)));
        } else {
          done();
          this.uploaded.emit(evt.media);
        }
      },
      error: (err) => {
        done();
        this.error.set(
          validationErrors(err)?.['file'] ??
            apiErrorMessage(err, "La photo n'a pas pu être envoyée. Réessaie."),
        );
      },
    });
    this.subs.add(sub);
  }
}
