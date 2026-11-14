import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FinanceStats, GovernorateStat, KpiStats, ProductStat } from '../models';

export const STATS_URL = `${environment.apiUrl}/api/admin/stats`;

/** `month` et `productId` optionnels (CONTRACT v2 › stats). */
export function statsParams(month?: string, productId?: number | null): HttpParams | undefined {
  let params = new HttpParams();
  if (month) params = params.set('month', month);
  if (productId != null) params = params.set('productId', productId);
  return params.keys().length ? params : undefined;
}

@Injectable({ providedIn: 'root' })
export class StatsApi {
  private readonly http = inject(HttpClient);

  kpis(month?: string, productId?: number | null): Observable<KpiStats> {
    return this.http.get<KpiStats>(`${STATS_URL}/kpis`, { params: statsParams(month, productId) });
  }

  finance(month?: string, productId?: number | null): Observable<FinanceStats> {
    return this.http.get<FinanceStats>(`${STATS_URL}/finance`, {
      params: statsParams(month, productId),
    });
  }

  governorates(month?: string, productId?: number | null): Observable<GovernorateStat[]> {
    return this.http.get<GovernorateStat[]>(`${STATS_URL}/governorates`, {
      params: statsParams(month, productId),
    });
  }

  /** v2 : répartition par pack. */
  products(month?: string): Observable<ProductStat[]> {
    return this.http.get<ProductStat[]>(`${STATS_URL}/products`, { params: statsParams(month) });
  }
}
