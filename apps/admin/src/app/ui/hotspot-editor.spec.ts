import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Media } from '../core/models';
import { HotspotChange, HotspotEditor } from './hotspot-editor';

const COVER: Media = { id: 1, url: '/api/media/1', contentType: 'image/png', width: 1000, height: 500, alt: 'Pack' };

describe('HotspotEditor', () => {
  let fixture: ComponentFixture<HotspotEditor>;
  let changes: HotspotChange[];
  let el: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HotspotEditor);
    fixture.componentRef.setInput('cover', COVER);
    fixture.componentRef.setInput('points', [
      { key: 'a', label: 'Moka', hotspot: { x: 72, y: 76 } },
      { key: 'b', label: 'Thermos', hotspot: null },
    ]);
    changes = [];
    fixture.componentInstance.changed.subscribe((c) => changes.push(c));
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  function box(): HTMLElement {
    const surface = el.querySelector<HTMLButtonElement>('button[aria-label^="Photo principale"]')!;
    const b = surface.parentElement!;
    b.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 500, right: 1000, bottom: 500, x: 0, y: 0, toJSON: () => ({}) });
    return b;
  }

  it('places the selected item pin in % of the photo on click', () => {
    fixture.componentInstance.selected.set('b');
    fixture.detectChanges();
    box();
    const surface = el.querySelector<HTMLButtonElement>('button[aria-label^="Photo principale"]')!;
    expect(surface.disabled).toBe(false);
    surface.dispatchEvent(new MouseEvent('click', { clientX: 840, clientY: 330, detail: 1, bubbles: true }));
    expect(changes).toEqual([{ key: 'b', hotspot: { x: 84, y: 66 } }]);
  });

  it('keeps the surface disabled until an item is selected', () => {
    const surface = el.querySelector<HTMLButtonElement>('button[aria-label^="Photo principale"]')!;
    expect(surface.disabled).toBe(true);
  });

  it('renders placed pins at their percentage and nudges them with the arrows', () => {
    const pin = el.querySelector<HTMLElement>('[data-hotspot="a"]')!;
    expect(pin.style.left).toBe('72%');
    expect(pin.style.top).toBe('76%');
    pin.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
    pin.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(changes).toEqual([
      { key: 'a', hotspot: { x: 77, y: 76 } },
      { key: 'a', hotspot: null },
    ]);
  });

  it('asks for a cover photo first', () => {
    fixture.componentRef.setInput('cover', null);
    fixture.detectChanges();
    expect(el.textContent).toContain("Ajoute d'abord une photo principale");
  });
});
