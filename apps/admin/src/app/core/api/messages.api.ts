import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  GenerateMessageRequest,
  GeneratedMessage,
  MessageTone,
  OrderMessage,
  SendMessageRequest,
} from '../models';
import { ORDERS_URL } from './orders.api';

@Injectable({ providedIn: 'root' })
export class MessagesApi {
  private readonly http = inject(HttpClient);

  generate(orderId: number, tone: MessageTone): Observable<GeneratedMessage> {
    const body: GenerateMessageRequest = { tone };
    return this.http.post<GeneratedMessage>(`${ORDERS_URL}/${orderId}/messages/generate`, body);
  }

  send(orderId: number, text: string): Observable<OrderMessage> {
    const body: SendMessageRequest = { body: text };
    return this.http.post<OrderMessage>(`${ORDERS_URL}/${orderId}/messages/send`, body);
  }
}
