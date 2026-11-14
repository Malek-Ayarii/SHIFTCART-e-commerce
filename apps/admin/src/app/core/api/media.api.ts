import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Media } from '../models';

export const MEDIA_URL = `${environment.apiUrl}/api/admin/media`;

/** Progression d'un envoi : `progress` (0–100) puis `done` avec le média créé. */
export type UploadEvent = { kind: 'progress'; percent: number } | { kind: 'done'; media: Media };

export function toUploadEvent(e: HttpEvent<Media>): UploadEvent | null {
  if (e.type === HttpEventType.UploadProgress) {
    const total = e.total ?? 0;
    return { kind: 'progress', percent: total > 0 ? Math.round((e.loaded / total) * 100) : 0 };
  }
  if (e.type === HttpEventType.Response && e.body) return { kind: 'done', media: e.body };
  return null;
}

/** Médias (CONTRACT v2 › Admin — médias). */
@Injectable({ providedIn: 'root' })
export class MediaApi {
  private readonly http = inject(HttpClient);

  /** multipart `file` (+ `alt`), avec suivi de progression (barre de progression). */
  upload(file: File, alt?: string): Observable<UploadEvent> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (alt?.trim()) form.append('alt', alt.trim());
    return this.http
      .post<Media>(MEDIA_URL, form, { reportProgress: true, observe: 'events' })
      .pipe(
        map((e) => toUploadEvent(e)),
        filter((e): e is UploadEvent => e !== null),
      );
  }

  updateAlt(id: number, alt: string): Observable<Media> {
    return this.http.patch<Media>(`${MEDIA_URL}/${id}`, { alt });
  }
}
