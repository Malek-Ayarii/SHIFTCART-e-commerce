import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssembleRequest, StockItemPatch, StockOverview, StockPatchRequest } from '../models';

const STOCK_URL = `${environment.apiUrl}/api/admin/stock`;

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

  assemble(packs: number): Observable<StockOverview> {
    const body: AssembleRequest = { packs };
    return this.http.post<StockOverview>(`${STOCK_URL}/assemble`, body);
  }
}
