import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  OrderCounts,
  OrderDetail,
  OrderListQuery,
  OrderSummary,
  Page,
  StatusUpdateRequest,
} from '../models';

export const ORDERS_URL = `${environment.apiUrl}/api/admin/orders`;

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);

  list(query: OrderListQuery = {}): Observable<Page<OrderSummary>> {
    let params = new HttpParams();
    for (const s of query.status ?? []) params = params.append('status', s);
    if (query.q) params = params.set('q', query.q);
    if (query.month) params = params.set('month', query.month);
    if (query.page != null) params = params.set('page', query.page);
    if (query.size != null) params = params.set('size', query.size);
    return this.http.get<Page<OrderSummary>>(ORDERS_URL, { params });
  }

  counts(month?: string): Observable<OrderCounts> {
    const params = month ? new HttpParams().set('month', month) : undefined;
    return this.http.get<OrderCounts>(`${ORDERS_URL}/counts`, { params });
  }

  get(id: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${ORDERS_URL}/${id}`);
  }

  updateStatus(id: number, body: StatusUpdateRequest): Observable<OrderDetail> {
    return this.http.patch<OrderDetail>(`${ORDERS_URL}/${id}/status`, body);
  }

  /** Bon de livraison PDF, récupéré avec le Bearer (aucun lien direct non authentifié). */
  deliverySlip(id: number): Observable<Blob> {
    return this.http.get(`${ORDERS_URL}/${id}/delivery-slip.pdf`, { responseType: 'blob' });
  }
}
