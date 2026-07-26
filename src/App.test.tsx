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

  it('switches to the Army Calculator and back', () => {
    const armyTab = [...container.querySelectorAll('.pill--tool')].find(
      (b) => b.getAttribute('aria-label') === 'Army Calculator',
    )!;
    click(armyTab);

    expect(window.location.hash).toContain('tool=army');
    expect(container.textContent).toContain('Barracks #1');
    expect(container.textContent).toContain('Great Barracks');
    // The unit-attributes table is gone, not merely hidden.
    expect(container.querySelector('.results__table')).toBeNull();

    const unitsTab = [...container.querySelectorAll('.pill--tool')].find(
      (b) => b.getAttribute('aria-label') === 'Unit Attributes',
    )!;
    click(unitsTab);
    expect(rows()).toHaveLength(21);
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

describe('the army calculator', () => {
  beforeEach(() => {
    const armyTab = [...container.querySelectorAll('.pill--tool')].find(
      (b) => b.getAttribute('aria-label') === 'Army Calculator',
    )!;
    click(armyTab);
  });

  const groupCard = (index: number) => container.querySelectorAll('.qgroup')[index];
  const cell = (name: string) =>
    [...container.querySelectorAll('.qcell')].find(
      (q) => q.querySelector('.qcell__name')?.textContent === name,
    )!;

  const setLevel = (name: string, value: string) => {
    const input = cell(name).querySelector('.text-input--level') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  const strip = () =>
    [...container.querySelectorAll('.strip__cell')].map((c) =>
      Number(c.querySelector('.strip__count')!.textContent!.replace(/,/g, '')),
    );

  it('groups the three barracks into one row with a shared picker', () => {
    const names = [...groupCard(0).querySelectorAll('.qcell__name')].map((n) => n.textContent);
    expect(names).toEqual(['Barracks #1', 'Barracks #2', 'Great Barracks']);
    // One picker for the group, not one per queue.
    expect(groupCard(0).querySelectorAll('.qgroup__units')).toHaveLength(1);
  });

  it('lists all seven queues across three groups', () => {
    expect(container.querySelectorAll('.qgroup')).toHaveLength(3);
    const names = [...container.querySelectorAll('.qcell__name')].map((n) => n.textContent);
    expect(names).toEqual([
      'Barracks #1',
      'Barracks #2',
      'Great Barracks',
      'Stable #1',
      'Stable #2',
      'Great Stable',
      'Workshop',
    ]);
  });

  it('offers every unit of the right type, and no leaders or settlers', () => {
    const picks = (i: number) =>
      [...groupCard(i).querySelectorAll('.unit-pick')].map((pick) =>
        pick.getAttribute('aria-label'),
      );

    expect(picks(0)).toEqual(['Emberblade', 'Shieldbearer', 'Iron Spear']);
    expect(picks(1)).toEqual(['Sentinel', 'Sun Rider', 'Crimson Lancer']);
    expect(picks(2)).toEqual(['Iron Ram', 'Dominion Catapult']);

    const all = [...container.querySelectorAll('.unit-pick')].map((pick) =>
      pick.getAttribute('aria-label'),
    );
    expect(all).not.toContain('High Prefect');
    expect(all).not.toContain('Settler');
  });

  it('marks the Great Barracks as triple cost', () => {
    expect(cell('Great Barracks').textContent).toContain('×3');
    expect(cell('Barracks #1').textContent).not.toContain('×3');
  });

  it('defaults to 3× and switches server speed', () => {
    const speeds = [...container.querySelectorAll('.pill--speed')];
    expect(speeds.map((s) => s.textContent)).toEqual(['1×', '3×', '10×']);
    expect(speeds[1].getAttribute('aria-pressed')).toBe('true');

    click(speeds[2]);
    expect(window.location.hash).toContain('x=10');
  });

  it('shows a slot for every trainable unit, zeroes included', () => {
    // Eight trainable units: no leader, no settler.
    expect(strip()).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('produces an army once a queue is set up', () => {
    setLevel('Barracks #1', '20');
    click(groupCard(0).querySelectorAll('.unit-pick')[0]);

    const counts = strip();
    expect(counts[0]).toBeGreaterThan(0);
    // The other slots stay in place rather than disappearing.
    expect(counts).toHaveLength(8);
    expect(counts.slice(1)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(window.location.hash).toContain('barracks1=20');
    expect(window.location.hash).toContain('u_barracks=emberblade');
  });

  it('splits a queue between two selected units', () => {
    setLevel('Barracks #1', '20');
    click(groupCard(0).querySelectorAll('.unit-pick')[0]);
    const solo = strip()[0];

    click(groupCard(0).querySelectorAll('.unit-pick')[1]);
    const [first, second] = strip();

    expect(first).toBe(Math.floor(solo / 2));
    expect(second).toBeGreaterThan(0);
  });

  it('offers a level-22 shortcut only where the game allows it', () => {
    const shortcuts = (name: string) =>
      [...cell(name).querySelectorAll('.qcell__level .pill')].map((b) => b.textContent);

    expect(shortcuts('Barracks #1')).toEqual(['0', '20', '22']);
    expect(shortcuts('Great Barracks')).toEqual(['0', '20']);
  });

  it('reports resources per hour and a split attack', () => {
    setLevel('Barracks #1', '20');
    click(groupCard(0).querySelectorAll('.unit-pick')[0]);

    expect(container.textContent).toContain('Per hour');
    expect(container.textContent).toContain('Infantry attack');
    expect(container.textContent).toContain('Cavalry attack');
    expect(container.textContent).toContain('Total attack');
    expect(container.textContent).toContain('Upkeep');
  });
});
