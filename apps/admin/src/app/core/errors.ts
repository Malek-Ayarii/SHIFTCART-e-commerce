import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from './models';

/** Message lisible d'une erreur API (`{ error, message }`), sinon `fallback`. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Connexion au serveur impossible. Vérifie ta connexion et réessaie.';
    }
    const body = err.error as Partial<ApiErrorBody> | null;
    if (body && typeof body === 'object' && typeof body.message === 'string' && body.message) {
      return body.message;
    }
  }
  return fallback;
}

export function apiErrorStatus(err: unknown): number | null {
  return err instanceof HttpErrorResponse ? err.status : null;
}
