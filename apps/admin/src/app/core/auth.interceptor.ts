import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AUTH_URL, AuthService } from './auth.service';

/** Marque une requête déjà rejouée après refresh (un seul essai). */
export const AUTH_RETRIED = new HttpContextToken<boolean>(() => false);

/** Routes d'auth qui ne portent pas de Bearer et ne déclenchent pas de refresh. */
function isAuthEndpoint(url: string): boolean {
  return (
    url.startsWith(`${AUTH_URL}/login`) ||
    url.startsWith(`${AUTH_URL}/refresh`) ||
    url.startsWith(`${AUTH_URL}/logout`)
  );
}

function isApiCall(url: string): boolean {
  return url.startsWith('/api/') || url.includes('/api/');
}

function withBearer(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

/**
 * Ajoute `Authorization: Bearer <accessToken>` aux appels API.
 * Sur 401 : tente un refresh (une seule fois), rejoue la requête, sinon renvoie vers /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiCall(req.url) || isAuthEndpoint(req.url)) {
    return next(req);
  }
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(withBearer(req, auth.accessToken())).pipe(
    catchError((err: unknown) => {
      if (
        !(err instanceof HttpErrorResponse) ||
        err.status !== 401 ||
        req.context.get(AUTH_RETRIED)
      ) {
        return throwError(() => err);
      }
      return from(auth.refresh()).pipe(
        switchMap((ok) => {
          if (!ok) {
            const current = router.url;
            const redirect = current && current !== '/' && !current.startsWith('/login') ? current : null;
            void router.navigate(['/login'], { queryParams: redirect ? { redirect } : {} });
            return throwError(() => err);
          }
          const retried = req.clone({ context: req.context.set(AUTH_RETRIED, true) });
          return next(withBearer(retried, auth.accessToken()));
        }),
      );
    }),
  );
};
