import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FinanceStats, GovernorateStat, KpiStats } from '../models';

const STATS_URL = `${environment.apiUrl}/api/admin/stats`;

function monthParams(month?: string): HttpParams | undefined {
  return month ? new HttpParams().set('month', month) : undefined;
}

@Injectable({ providedIn: 'root' })
export class StatsApi {
  private readonly http = inject(HttpClient);

  kpis(month?: string): Observable<KpiStats> {
    return this.http.get<KpiStats>(`${STATS_URL}/kpis`, { params: monthParams(month) });
  }

  finance(month?: string): Observable<FinanceStats> {
    return this.http.get<FinanceStats>(`${STATS_URL}/finance`, { params: monthParams(month) });
  }

  governorates(month?: string): Observable<GovernorateStat[]> {
    return this.http.get<GovernorateStat[]>(`${STATS_URL}/governorates`, {
      params: monthParams(month),
    });
  }
}
