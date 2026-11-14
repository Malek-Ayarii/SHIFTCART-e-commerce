import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, toArray } from 'rxjs';
import { Media } from '../models';
import { MediaApi } from './media.api';
import { OrdersApi } from './orders.api';
import { ProductsApi } from './products.api';
import { StatsApi } from './stats.api';
import { StockApi } from './stock.api';

describe('CONTRACT v2 services', () => {
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  describe('ProductsApi', () => {
    it('uses the admin products routes and verbs', () => {
      const api = TestBed.inject(ProductsApi);
      const input = { name: 'Le Pack Barista', tagline: 'Ton café de pro', priceTnd: 89, active: true, savings: null };
      api.list().subscribe();
      api.get(3).subscribe();
      api.create(input).subscribe();
      api.update(3, input).subscribe();
      api.delete(3).subscribe();
      api.reorder([3, 1, 2, 4]).subscribe();
      api.setCover(3, 12).subscribe();
      api.setCover(3, null).subscribe();
      api.setGallery(3, [12, 15]).subscribe();
      api.setItems(3, [{ stockItemId: 3, quantity: 1, gift: false, hotspot: { x: 84, y: 66 } }]).subscribe();

      const expectReq = (method: string, url: string, body?: unknown) => {
        const req = ctrl.expectOne((r) => r.method === method && r.url === url && (body === undefined || JSON.stringify(r.body) === JSON.stringify(body)));
        req.flush(method === 'DELETE' || url.endsWith('/order') ? null : {});
      };
      expectReq('GET', '/api/admin/products');
      expectReq('GET', '/api/admin/products/3');
      expectReq('POST', '/api/admin/products', input);
      expectReq('PUT', '/api/admin/products/3', input);
      expectReq('DELETE', '/api/admin/products/3');
      expectReq('PUT', '/api/admin/products/order', { ids: [3, 1, 2, 4] });
      expectReq('PUT', '/api/admin/products/3/cover', { mediaId: 12 });
      expectReq('PUT', '/api/admin/products/3/cover', { mediaId: null });
      expectReq('PUT', '/api/admin/products/3/gallery', { mediaIds: [12, 15] });
      expectReq('PUT', '/api/admin/products/3/items', {
        items: [{ stockItemId: 3, quantity: 1, gift: false, hotspot: { x: 84, y: 66 } }],
      });
    });
  });

  describe('MediaApi', () => {
    it('uploads multipart with progress, then emits the created media', async () => {
      const api = TestBed.inject(MediaApi);
      const file = new File([new Uint8Array(10)], 'pack.png', { type: 'image/png' });
      const events = firstValueFrom(api.upload(file, ' Le Pack Barista ').pipe(toArray()));
      const req = ctrl.expectOne('/api/admin/media');
      expect(req.request.method).toBe('POST');
      expect(req.request.reportProgress).toBe(true);
      const body = req.request.body as FormData;
      expect((body.get('file') as File).name).toBe('pack.png');
      expect(body.get('alt')).toBe('Le Pack Barista');
      const media: Media = { id: 12, url: '/api/media/12', contentType: 'image/png', width: 1024, height: 572, alt: 'Le Pack Barista' };
      req.event({ type: HttpEventType.UploadProgress, loaded: 5, total: 10 });
      req.flush(media);
      expect(await events).toEqual([
        { kind: 'progress', percent: 50 },
        { kind: 'done', media },
      ]);
    });

    it('patches the alt text', () => {
      TestBed.inject(MediaApi).updateAlt(12, 'Moka').subscribe();
      const req = ctrl.expectOne('/api/admin/media/12');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ alt: 'Moka' });
      req.flush({});
    });
  });

  describe('StockApi v2', () => {
    it('creates, deletes and assembles per pack', () => {
      const api = TestBed.inject(StockApi);
      api.createItem({ name: 'Gourde', unitCostTnd: 0, quantity: 0, threshold: 5 }).subscribe();
      api.deleteItem(7).subscribe();
      api.assemble(2, 5).subscribe();
      api.patch([{ id: 1, photoMediaId: null, description: 'x' }]).subscribe();

      const create = ctrl.expectOne('/api/admin/stock/items');
      expect(create.request.method).toBe('POST');
      create.flush({});
      const del = ctrl.expectOne('/api/admin/stock/items/7');
      expect(del.request.method).toBe('DELETE');
      del.flush(null);
      const asm = ctrl.expectOne('/api/admin/stock/assemble');
      expect(asm.request.body).toEqual({ productId: 2, packs: 5 });
      asm.flush({});
      const patch = ctrl.expectOne('/api/admin/stock');
      expect(patch.request.body).toEqual({ items: [{ id: 1, photoMediaId: null, description: 'x' }] });
      patch.flush({});
    });
  });

  describe('productId filter', () => {
    it('is sent on orders list and counts only when set', () => {
      const api = TestBed.inject(OrdersApi);
      api.list({ status: ['NEW'], month: '2026-11', productId: 3 }).subscribe();
      api.counts('2026-11', 3).subscribe();
      api.counts('2026-11', null).subscribe();

      const list = ctrl.expectOne((r) => r.url === '/api/admin/orders');
      expect(list.request.params.get('productId')).toBe('3');
      expect(list.request.params.getAll('status')).toEqual(['NEW']);
      list.flush({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 });
      const counts = ctrl.match((r) => r.url === '/api/admin/orders/counts');
      expect(counts.map((c) => c.request.params.get('productId'))).toEqual(['3', null]);
      counts.forEach((c) => c.flush({}));
    });

    it('is sent on kpis / finance / governorates; products stats by month', () => {
      const api = TestBed.inject(StatsApi);
      api.kpis('2026-11', 4).subscribe();
      api.finance('2026-11', 4).subscribe();
      api.governorates(undefined, 4).subscribe();
      api.products('2026-11').subscribe();
      for (const path of ['kpis', 'finance', 'governorates']) {
        const req = ctrl.expectOne((r) => r.url === `/api/admin/stats/${path}`);
        expect(req.request.params.get('productId')).toBe('4');
        req.flush({});
      }
      const products = ctrl.expectOne((r) => r.url === '/api/admin/stats/products');
      expect(products.request.params.get('month')).toBe('2026-11');
      expect(products.request.params.has('productId')).toBe(false);
      products.flush([]);
    });
  });
});
