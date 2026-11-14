import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssembleRequest,
  StockItemCreate,
  StockItemPatch,
  StockOverview,
  StockPatchRequest,
} from '../models';

export const STOCK_URL = `${environment.apiUrl}/api/admin/stock`;

/** Stock v2 (CONTRACT v2 › Admin — stock v2). */
@Injectable({ providedIn: 'root' })
export class StockApi {
  private readonly http = inject(HttpClient);

  get(): Observable<StockOverview> {
    return this.http.get<StockOverview>(STOCK_URL);
  }

  patch(items: StockItemPatch[]): Observable<StockOverview> {
    const body: StockPatchRequest = { items };
    return this.http.patch<StockOverview>(STOCK_URL, body);
  }

  createItem(item: StockItemCreate): Observable<StockOverview> {
    return this.http.post<StockOverview>(`${STOCK_URL}/items`, item);
  }

  deleteItem(id: number): Observable<void> {
    return this.http.delete<void>(`${STOCK_URL}/items/${id}`);
  }

  assemble(productId: number, packs: number): Observable<StockOverview> {
    const body: AssembleRequest = { productId, packs };
    return this.http.post<StockOverview>(`${STOCK_URL}/assemble`, body);
  }
}
