import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PackItemInput, ProductAdmin, ProductInput } from '../models';

export const PRODUCTS_URL = `${environment.apiUrl}/api/admin/products`;

/** Packs (CONTRACT v2 › Admin — packs). */
@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<ProductAdmin[]> {
    return this.http.get<ProductAdmin[]>(PRODUCTS_URL);
  }

  get(id: number): Observable<ProductAdmin> {
    return this.http.get<ProductAdmin>(`${PRODUCTS_URL}/${id}`);
  }

  create(input: ProductInput): Observable<ProductAdmin> {
    return this.http.post<ProductAdmin>(PRODUCTS_URL, input);
  }

  update(id: number, input: ProductInput): Observable<ProductAdmin> {
    return this.http.put<ProductAdmin>(`${PRODUCTS_URL}/${id}`, input);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${PRODUCTS_URL}/${id}`);
  }

  /** Réécrit `sortOrder` dans l'ordre donné. */
  reorder(ids: number[]): Observable<void> {
    return this.http.put<void>(`${PRODUCTS_URL}/order`, { ids });
  }

  setCover(id: number, mediaId: number | null): Observable<ProductAdmin> {
    return this.http.put<ProductAdmin>(`${PRODUCTS_URL}/${id}/cover`, { mediaId });
  }

  setGallery(id: number, mediaIds: number[]): Observable<ProductAdmin> {
    return this.http.put<ProductAdmin>(`${PRODUCTS_URL}/${id}/gallery`, { mediaIds });
  }

  setItems(id: number, items: PackItemInput[]): Observable<ProductAdmin> {
    return this.http.put<ProductAdmin>(`${PRODUCTS_URL}/${id}/items`, { items });
  }
}
