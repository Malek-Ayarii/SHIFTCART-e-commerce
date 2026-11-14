import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminUser, AuthResponse, LoginRequest } from './models';

export const AUTH_URL = `${environment.apiUrl}/api/auth`;

/**
 * Session admin : access token JWT en mémoire uniquement (jamais en localStorage),
 * refresh token en cookie httpOnly `sc_refresh` géré par l'API.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly token = signal<string | null>(null);
  private readonly currentUser = signal<AdminUser | null>(null);
  private refreshing: Promise<boolean> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.token() !== null && this.currentUser() !== null);

  /** Access token courant (lu par l'intercepteur). */
  accessToken(): string | null {
    return this.token();
  }

  async login(credentials: LoginRequest): Promise<AdminUser> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${AUTH_URL}/login`, credentials, { withCredentials: true }),
    );
    this.applySession(res);
    return res.user;
  }

  /**
   * Renouvelle l'access token avec le cookie de refresh.
   * Les appels concurrents partagent la même requête.
   */
  refresh(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = firstValueFrom(
        this.http.post<AuthResponse>(`${AUTH_URL}/refresh`, null, { withCredentials: true }),
      )
        .then((res) => {
          this.applySession(res);
          return true;
        })
        .catch(() => {
          this.clear();
          return false;
        })
        .finally(() => {
          this.refreshing = null;
        });
    }
    return this.refreshing;
  }

  /** Session valide ? Tente une fois le refresh (rechargement de page) si aucun token en mémoire. */
  async ensureSession(): Promise<boolean> {
    if (this.isAuthenticated()) return true;
    return this.refresh();
  }

  async me(): Promise<AdminUser> {
    const user = await firstValueFrom(this.http.get<AdminUser>(`${AUTH_URL}/me`));
    this.currentUser.set(user);
    return user;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<void>(`${AUTH_URL}/logout`, null, { withCredentials: true }),
      );
    } catch {
      // Déconnexion locale même si l'API ne répond pas.
    }
    this.clear();
    await this.router.navigate(['/login']);
  }

  /** Oublie la session locale (token + utilisateur). */
  clear(): void {
    this.token.set(null);
    this.currentUser.set(null);
  }

  private applySession(res: AuthResponse): void {
    this.token.set(res.accessToken);
    this.currentUser.set(res.user);
  }
}
