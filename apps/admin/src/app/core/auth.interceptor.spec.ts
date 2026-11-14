import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { AuthResponse } from './models';

const session = (token: string): AuthResponse => ({
  accessToken: token,
  expiresIn: 900,
  user: { id: 1, email: 'admin@shiftcart.tn', name: 'Admin', role: 'ADMIN' },
});

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => ctrl.verify());

  async function login(token: string): Promise<void> {
    const p = auth.login({ email: 'admin@shiftcart.tn', password: 'x' });
    const req = ctrl.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(true);
    req.flush(session(token));
    await p;
  }

  it('attaches the Bearer token to API calls', async () => {
    await login('token-1');
    const p = firstValueFrom(http.get('/api/admin/stock'));
    const req = ctrl.expectOne('/api/admin/stock');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    req.flush({});
    await p;
  });

  it('does not attach a token to non-API requests', async () => {
    await login('token-1');
    const p = firstValueFrom(http.get('/assets/logos/x.png'));
    const req = ctrl.expectOne('/assets/logos/x.png');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    await p;
  });

  it('refreshes once on 401 and replays the request with the new token', async () => {
    await login('old');
    const p = firstValueFrom(http.get('/api/admin/orders/counts'));
    ctrl
      .expectOne('/api/admin/orders/counts')
      .flush({ error: 'UNAUTHORIZED', message: 'Expiré' }, { status: 401, statusText: 'Unauthorized' });

    const refresh = ctrl.expectOne('/api/auth/refresh');
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush(session('new'));
    // Laisse la promesse de refresh se résoudre avant le rejeu.
    await new Promise((r) => setTimeout(r));

    const retried = ctrl.expectOne('/api/admin/orders/counts');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer new');
    retried.flush({ NEW: 1 });
    await expect(p).resolves.toEqual({ NEW: 1 });
  });

  it('redirects to /login when the refresh fails', async () => {
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await login('old');
    const p = firstValueFrom(http.get('/api/admin/stock'));
    ctrl.expectOne('/api/admin/stock').flush(null, { status: 401, statusText: 'Unauthorized' });
    ctrl.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
    await expect(p).rejects.toBeTruthy();
    expect(nav).toHaveBeenCalledWith(['/login'], expect.anything());
    expect(auth.isAuthenticated()).toBe(false);
  });
});
