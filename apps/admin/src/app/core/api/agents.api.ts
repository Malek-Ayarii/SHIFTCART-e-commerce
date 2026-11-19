import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AgentAskRequest,
  AgentExchange,
  AgentRoster,
  AgentThreadDetail,
  AgentThreadSummary,
} from '../models';

export const AGENTS_URL = `${environment.apiUrl}/api/admin/agents`;

/** Agents IA (docs/CONTRACT.md › Agents IA). Une réponse peut prendre jusqu'à ~1 min (consultations). */
@Injectable({ providedIn: 'root' })
export class AgentsApi {
  private readonly http = inject(HttpClient);

  roster(): Observable<AgentRoster> {
    return this.http.get<AgentRoster>(AGENTS_URL);
  }

  threads(): Observable<AgentThreadSummary[]> {
    return this.http.get<AgentThreadSummary[]>(`${AGENTS_URL}/threads`);
  }

  thread(id: number): Observable<AgentThreadDetail> {
    return this.http.get<AgentThreadDetail>(`${AGENTS_URL}/threads/${id}`);
  }

  /** `threadId` null = nouvelle conversation. */
  ask(threadId: number | null, body: AgentAskRequest): Observable<AgentExchange> {
    const url = threadId == null ? `${AGENTS_URL}/threads` : `${AGENTS_URL}/threads/${threadId}/messages`;
    return this.http.post<AgentExchange>(url, body);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${AGENTS_URL}/threads/${id}`);
  }
}
