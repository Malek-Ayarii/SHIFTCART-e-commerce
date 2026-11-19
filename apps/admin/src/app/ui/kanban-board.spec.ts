import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Order } from '../core/order-view';
import { KanbanBoard, OrderMoveEvent } from './kanban-board';

const ORDERS: Order[] = [
  { key: 1, id: '2948', name: 'Mohamed Ben Ali', amount: 89, city: 'Tunis', status: 'new', age: 'il y a 4 min' },
  { key: 2, id: '2932', name: 'Sarra Slimen', amount: 89, city: 'Sousse', status: 'pending', age: 'il y a 3 h' },
  { key: 3, id: '2911', name: 'Yassine Gharbi', amount: 168, city: 'Tunis', status: 'confirmed', age: 'hier' },
  { key: 4, id: '2901', name: 'Amel Trabelsi', amount: 89, city: 'Sousse', status: 'shipped', carrier: 'Yalidine', tracking: 'YAL-88213', age: '2 j' },
];

describe('KanbanBoard', () => {
  let fixture: ComponentFixture<KanbanBoard>;
  let moves: OrderMoveEvent[];
  let rejections: OrderMoveEvent[];

  beforeEach(() => {
    localStorage.removeItem('sc.kanban.collapsed');
    fixture = TestBed.createComponent(KanbanBoard);
    fixture.componentRef.setInput('orders', ORDERS);
    fixture.componentRef.setInput('counts', { new: 14, pending: 8, confirmed: 24, shipped: 5 });
    moves = [];
    rejections = [];
    fixture.componentInstance.move.subscribe((e) => moves.push(e));
    fixture.componentInstance.rejected.subscribe((e) => rejections.push(e));
    fixture.detectChanges();
  });

  function card(key: number): HTMLElement {
    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-order-key="${key}"]`);
    if (!el) throw new Error(`card ${key} not found`);
    return el;
  }

  function press(key: number, k: string): KeyboardEvent {
    const evt = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    card(key).dispatchEvent(evt);
    return evt;
  }

  it('renders the four lanes with server counts', () => {
    const el = fixture.nativeElement as HTMLElement;
    const lanes = Array.from(el.querySelectorAll('[role="list"]')).map((l) => l.getAttribute('aria-label'));
    expect(lanes).toEqual(['Nouvelles', 'En attente', 'Confirmées', 'Expédiées']);
    const counts = Array.from(el.querySelectorAll('[data-testid="lane-count"]')).map((c) => c.textContent?.trim());
    expect(counts).toEqual(['14', '8', '24', '5']);
    expect(el.textContent).toContain('Yalidine · YAL-88213');
  });

  it('ArrowRight on a NEW card emits a move to PENDING', () => {
    const evt = press(1, 'ArrowRight');
    expect(evt.defaultPrevented).toBe(true);
    expect(moves).toHaveLength(1);
    expect(moves[0].order.key).toBe(1);
    expect(moves[0].from).toBe('new');
    expect(moves[0].to).toBe('pending');
  });

  it('ArrowRight on a CONFIRMED card targets SHIPPED', () => {
    press(3, 'ArrowRight');
    expect(moves.map((m) => m.to)).toEqual(['shipped']);
  });

  it('rejects a disallowed move (PENDING → NEW) instead of emitting it', () => {
    press(2, 'ArrowLeft');
    expect(moves).toHaveLength(0);
    expect(rejections).toEqual([{ order: ORDERS[1], from: 'pending', to: 'new' }]);
  });

  it('ignores arrow keys pressed on the card action button', () => {
    const btn = card(1).querySelector<HTMLButtonElement>('button');
    if (!btn) throw new Error('action button not found');
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(moves).toHaveLength(0);
  });

  it('ignores moves past the first or last lane', () => {
    press(1, 'ArrowLeft');
    press(4, 'ArrowRight');
    expect(moves).toHaveLength(0);
    expect(rejections).toHaveLength(0);
  });

  it('shows the empty-lane hint', () => {
    fixture.componentRef.setInput('orders', [ORDERS[0]]);
    fixture.componentRef.setInput('counts', null);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.match(/Dépose une commande ici/g)).toHaveLength(3);
  });

  it('collapses a lane like Trello, keeping its count and drop target', () => {
    const el = fixture.nativeElement as HTMLElement;
    const fold = el.querySelector<HTMLButtonElement>('button[aria-label="Replier la liste Nouvelles"]');
    if (!fold) throw new Error('fold button not found');
    fold.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-order-key="1"]')).toBeNull();
    expect(el.querySelector('button[aria-label="Déplier la liste Nouvelles"]')).not.toBeNull();
    expect(el.querySelectorAll('[role="list"]')).toHaveLength(4);
    expect(el.querySelector('[data-testid="lane-count"]')?.textContent?.trim()).toBe('14');
    expect(localStorage.getItem('sc.kanban.collapsed')).toBe('["new"]');
  });

  it('shows how many orders are not loaded in a lane', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('+ 13 autres');
  });
});
