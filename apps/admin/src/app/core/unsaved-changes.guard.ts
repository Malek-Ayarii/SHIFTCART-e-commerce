import { CanDeactivateFn } from '@angular/router';

/** Écran avec modifications locales (éditeur de pack). */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const UNSAVED_MESSAGE = 'Tu as des modifications non enregistrées. Quitter sans enregistrer ?';

/** Garde-fou : confirmation avant de quitter un écran modifié et non enregistré. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component?.hasUnsavedChanges() || window.confirm(UNSAVED_MESSAGE);
