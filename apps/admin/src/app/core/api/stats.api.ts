import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AnalyticsStats,
  CalendarYear,
  DayStat,
  FinanceStats,
  GovernorateStat,
  Granularity,
  KpiStats,
  ProductStat,
} from '../models';

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

  /** Analytique d'une période libre (dates AAAA-MM-JJ incluses, heure de Tunis). */
  analytics(
    from: string,
    to: string,
    granularity: Granularity,
    productId?: number | null,
    compare?: { from: string; to: string } | null,
  ): Observable<AnalyticsStats> {
    let params = new HttpParams().set('from', from).set('to', to).set('granularity', granularity);
    if (productId != null) params = params.set('productId', productId);
    if (compare) params = params.set('compareFrom', compare.from).set('compareTo', compare.to);
    return this.http.get<AnalyticsStats>(`${STATS_URL}/analytics`, { params });
  }

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

  /** Commandes et CA commandé jour par jour (graphique du tableau de bord). */
  daily(month?: string, productId?: number | null): Observable<DayStat[]> {
    return this.http.get<DayStat[]>(`${STATS_URL}/daily`, { params: statsParams(month, productId) });
  }

  /** Agenda : chaque jour de l'année. */
  calendar(year: number, productId?: number | null): Observable<CalendarYear> {
    let params = new HttpParams().set('year', year);
    if (productId != null) params = params.set('productId', productId);
    return this.http.get<CalendarYear>(`${STATS_URL}/calendar`, { params });
  }

  /** v2 : répartition par pack. */
  products(month?: string): Observable<ProductStat[]> {
    return this.http.get<ProductStat[]>(`${STATS_URL}/products`, { params: statsParams(month) });
  }
}
