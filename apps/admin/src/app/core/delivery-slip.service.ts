import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { OrdersApi } from './api/orders.api';
import { apiErrorMessage } from './errors';
import { ToastService } from './toast.service';

/**
 * Ouvre le bon de livraison PDF : téléchargement authentifié (Bearer) en blob,
 * puis affichage dans un nouvel onglet (ou téléchargement si le pop-up est bloqué).
 */
@Injectable({ providedIn: 'root' })
export class DeliverySlipService {
  private readonly api = inject(OrdersApi);
  private readonly toast = inject(ToastService);
  private readonly doc = inject(DOCUMENT);

  async open(orderId: number, ref: string): Promise<boolean> {
    const win = this.doc.defaultView;
    // Ouvert de façon synchrone (geste utilisateur) pour éviter le bloqueur de pop-up.
    const tab = win?.open('', '_blank') ?? null;
    try {
      const blob = await firstValueFrom(this.api.deliverySlip(orderId));
      const url = URL.createObjectURL(blob);
      if (tab && !tab.closed) {
        tab.location.href = url;
      } else {
        const a = this.doc.createElement('a');
        a.href = url;
        a.download = `bon-de-livraison-${ref}.pdf`;
        a.rel = 'noopener';
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return true;
    } catch (err) {
      tab?.close();
      this.toast.error(
        apiErrorMessage(err, "Le bon de livraison n'a pas pu être généré. Réessaie dans un instant."),
      );
      return false;
    }
  }
}
