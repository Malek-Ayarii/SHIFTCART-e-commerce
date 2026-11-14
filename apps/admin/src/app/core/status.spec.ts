import { API_ORDER_STATUSES } from './models';
import {
  KANBAN_LANES,
  STATUS_META,
  TRANSITIONS,
  canTransition,
  carrierLabel,
  toApiStatus,
  toUiStatus,
  transitionRejectedMessage,
} from './status';

describe('status mapping', () => {
  it('maps every API status to its component status and back', () => {
    expect(toUiStatus('NEW')).toBe('new');
    expect(toUiStatus('PENDING')).toBe('pending');
    expect(toUiStatus('CONFIRMED')).toBe('confirmed');
    expect(toUiStatus('SHIPPED')).toBe('shipped');
    expect(toUiStatus('DELIVERED')).toBe('delivered');
    expect(toUiStatus('RETURNED')).toBe('returned');
    expect(toUiStatus('CANCELLED')).toBe('cancelled');
    for (const s of API_ORDER_STATUSES) {
      expect(toApiStatus(toUiStatus(s))).toBe(s);
    }
  });

  it('gives every status a word, an icon and a color (never color alone)', () => {
    for (const s of API_ORDER_STATUSES) {
      const meta = STATUS_META[toUiStatus(s)];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.icon).toBeTruthy();
      expect(meta.badgeClass).toMatch(/bg-/);
    }
    expect(STATUS_META.new.label).toBe('Nouvelle');
    expect(STATUS_META.pending.lane).toBe('En attente');
    expect(STATUS_META.confirmed.lane).toBe('Confirmées');
    expect(STATUS_META.shipped.lane).toBe('Expédiées');
  });

  it('orders the Kanban lanes like the COD pipeline', () => {
    expect(KANBAN_LANES).toEqual(['new', 'pending', 'confirmed', 'shipped']);
  });
});

describe('transitions', () => {
  it('matches docs/CONTRACT.md', () => {
    expect(TRANSITIONS.NEW).toEqual(['CONFIRMED', 'PENDING', 'CANCELLED']);
    expect(TRANSITIONS.PENDING).toEqual(['CONFIRMED', 'CANCELLED']);
    expect(TRANSITIONS.CONFIRMED).toEqual(['SHIPPED', 'CANCELLED']);
    expect(TRANSITIONS.SHIPPED).toEqual(['DELIVERED', 'RETURNED']);
    expect(TRANSITIONS.DELIVERED).toEqual([]);
    expect(TRANSITIONS.RETURNED).toEqual([]);
    expect(TRANSITIONS.CANCELLED).toEqual([]);
  });

  it('accepts allowed moves and rejects the others', () => {
    expect(canTransition('new', 'pending')).toBe(true);
    expect(canTransition('new', 'confirmed')).toBe(true);
    expect(canTransition('pending', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'shipped')).toBe(true);
    expect(canTransition('shipped', 'delivered')).toBe(true);

    expect(canTransition('pending', 'new')).toBe(false);
    expect(canTransition('new', 'shipped')).toBe(false);
    expect(canTransition('shipped', 'confirmed')).toBe(false);
    expect(canTransition('delivered', 'returned')).toBe(false);
  });

  it('explains a rejected move in French', () => {
    expect(transitionRejectedMessage('pending', 'new')).toBe(
      'Impossible de passer une commande « En attente » en « Nouvelle ».',
    );
  });

  it('labels carriers', () => {
    expect(carrierLabel('YALIDINE')).toBe('Yalidine');
    expect(carrierLabel('BOSTA')).toBe('Bosta');
    expect(carrierLabel('ARAMEX')).toBe('Aramex');
    expect(carrierLabel(null)).toBeUndefined();
  });
});
