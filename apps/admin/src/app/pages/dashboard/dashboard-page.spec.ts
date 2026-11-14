import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppState } from '../../core/app-state';
import { DashboardPage } from './dashboard-page';

describe('DashboardPage — pack filter', () => {
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    ctrl = TestBed.inject(HttpTestingController);
  });

  function productIdsOf(url: string): (string | null)[] {
    return ctrl.match((r) => r.url === url).map((r) => {
      const v = r.request.params.get('productId');
      r.flush(url.endsWith('/orders') ? { content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 } : {});
      return v;
    });
  }

  it('sends productId on orders list, counts and kpis when a pack is selected', async () => {
    const state = TestBed.inject(AppState);
    state.productFilter.set(3);
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await fixture.whenStable();

    ctrl.match('/api/admin/products').forEach((r) => r.flush([]));
    expect(productIdsOf('/api/admin/stats/kpis')).toEqual(['3']);
    expect(productIdsOf('/api/admin/orders/counts')).toEqual(['3']);
    expect(productIdsOf('/api/admin/orders')).toEqual(['3', '3', '3', '3']);

    // Retour à « Tous les packs » : plus de productId.
    state.productFilter.set(null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(productIdsOf('/api/admin/stats/kpis')).toEqual([null]);
    expect(productIdsOf('/api/admin/orders')).toEqual([null, null, null, null]);
    productIdsOf('/api/admin/orders/counts');
    fixture.destroy();
  });
});
