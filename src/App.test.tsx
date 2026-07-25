// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { presets } from './state';

/**
 * A smoke test: mount the whole app, drive the controls the way a person
 * would, and check the table keeps up. Cheap insurance against the kind of
 * runtime break that a typecheck happily lets through.
 */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.location.hash = '';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<App />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const rows = () => [...container.querySelectorAll('tbody tr')];
const values = () =>
  rows().map((r) => Number(r.querySelector('.value-cell__number')!.textContent));
const click = (el: Element) =>
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

describe('the app', () => {
  it('renders a ranked table on first load', () => {
    expect(rows()).toHaveLength(21);
    const v = values();
    expect(v).toEqual([...v].sort((a, b) => b - a));
    expect(container.textContent).toContain('Emberblade');
  });

  it('shows real unit artwork rather than the emoji fallback', () => {
    const imgs = container.querySelectorAll('img.unit-icon');
    expect(imgs).toHaveLength(21);
    expect(container.querySelectorAll('.unit-icon--glyph')).toHaveLength(0);
  });

  it('rates raiding as speed × carry, over cost only in the early preset', () => {
    const byKey = (k: string) => presets.find((p) => p.key === k)!.patch;

    expect(byKey('early-farm')).toMatchObject({
      stats: ['c'],
      bySpeed: true,
      divisors: ['tc'],
    });
    // Late raiding is raw throughput: no divisor at all.
    expect(byKey('late-farm')).toMatchObject({
      stats: ['c'],
      bySpeed: true,
      divisors: [],
    });
  });

  it('renders a divisor-free rating without breaking the table', () => {
    const lateFarm = [...container.querySelectorAll('.pill--preset')].find(
      (b) => b.textContent === presets.find((p) => p.key === 'late-farm')!.label,
    )!;
    click(lateFarm);

    expect(rows()).toHaveLength(21);
    expect(values().every(Number.isFinite)).toBe(true);
    expect(window.location.hash).not.toContain('d=');
  });

  it('records settings in the URL so a configuration is shareable', () => {
    expect(window.location.hash).toContain('g=all');
    expect(window.location.hash).toContain('d=tc');
  });

  it('re-ranks when a preset is applied', () => {
    const before = container.querySelector('tbody tr')!.textContent;

    const lateDef = [...container.querySelectorAll('.pill--preset')].find(
      (b) => b.textContent === presets.find((p) => p.key === 'late-def')!.label,
    )!;
    click(lateDef);

    expect(container.querySelector('tbody tr')!.textContent).not.toBe(before);
    expect(window.location.hash).toContain('sm=20');
    expect(window.location.hash).toContain('g=defense');
  });

  it('switches roster and drops stats the new roster cannot use', () => {
    const select = container.querySelector('.select') as HTMLSelectElement;
    act(() => {
      select.value = 'recon';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(rows()).toHaveLength(4);
    expect(container.textContent).toContain('Wind Scout');
    // 'a' (offense) is not a reconnaissance stat, so it must not survive.
    expect(window.location.hash).not.toContain('n=a');
  });

  it('shows a readable error for a broken formula, without clearing the page', () => {
    const input = container.querySelector('.text-input') as HTMLInputElement;
    act(() => {
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(input, 'a / (');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(container.querySelector('.error')).toBeTruthy();
    expect(container.textContent).toMatch(/brackets|ends too early/i);
  });
});
