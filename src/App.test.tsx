// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { APP_VERSION } from './data/changelog';
import { decodeState } from './pages/OperationPlanner';
import { presets } from './state';

/**
 * A smoke test: mount the whole app, drive the controls the way a person
 * would, and check the table keeps up. Cheap insurance against the kind of
 * runtime break that a typecheck happily lets through.
 */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.localStorage.clear();
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

const setInputValue = (input: HTMLInputElement, value: string) =>
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
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

  it('shows a stat card when a unit icon in the table is tapped, and hides it again', () => {
    const trigger = container.querySelector('.unit-icon-trigger') as HTMLElement;
    expect(trigger).toBeTruthy();
    expect(document.querySelector('.stat-card-popover')).toBeNull();

    click(trigger);
    const popover = document.querySelector('.stat-card-popover');
    expect(popover).toBeTruthy();
    expect(popover!.textContent).toContain('Attack');
    expect(popover!.textContent).toContain('Speed');

    click(trigger);
    expect(document.querySelector('.stat-card-popover')).toBeNull();
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

  it('opens the changelog from the version badge and closes it again', () => {
    const badge = container.querySelector('.brand__version') as HTMLButtonElement;
    expect(badge.textContent).toBe(`v${APP_VERSION}`);
    expect(container.querySelector('.changelog-overlay')).toBeNull();

    click(badge);
    expect(container.querySelector('.changelog-overlay')).toBeTruthy();
    expect(container.textContent).toContain(`v${APP_VERSION}`);

    click(container.querySelector('[aria-label="Close"]')!);
    expect(container.querySelector('.changelog-overlay')).toBeNull();
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

  // Counts render through toLocaleString, so the thousands separator is
  // whatever the machine's locale uses — a comma, a period, or the non-breaking
  // space Czech picks. Strip everything that is not a digit rather than
  // assuming one of them.
  const strip = () =>
    [...container.querySelectorAll('.strip__cell')].map((c) =>
      Number(c.querySelector('.strip__count')!.textContent!.replace(/\D/g, '')),
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

  it('shows a stat card for a produced unit, but not for the picker buttons', () => {
    // The picker buttons keep their plain title tooltip, no stat card.
    expect(groupCard(0).querySelectorAll('.unit-pick .unit-icon-trigger')).toHaveLength(0);

    const stripTrigger = container.querySelector(
      '.strip__cell .unit-icon-trigger',
    ) as HTMLElement;
    expect(stripTrigger).toBeTruthy();

    click(stripTrigger);
    const popover = document.querySelector('.stat-card-popover');
    expect(popover).toBeTruthy();
    expect(popover!.textContent).toContain('Speed');
  });
});

describe('the operation planner', () => {
  beforeEach(() => {
    const opTab = [...container.querySelectorAll('.pill--tool')].find(
      (b) => b.getAttribute('aria-label') === 'Operation Planner',
    )!;
    click(opTab);
  });

  it('renders attackers, targets, and the route plan table', () => {
    expect(window.location.hash).toContain('tool=operations');
    expect(container.textContent).toContain('Attacking Armies');
    expect(container.textContent).toContain('Target Defenders');
    expect(container.textContent).toContain('Route Plan');
    expect(container.textContent).toContain('24h UTC');
    expect(container.querySelector('.op-roster-summary-bar')).toBeNull();
    expect(container.querySelector('.op-participant-picker')).toBeNull();
  });

  it('places Name and Coordinate X/Y inputs inline in card headers', () => {
    const cardIdentity = container.querySelector('.op-strip-card__identity');
    expect(cardIdentity).toBeTruthy();
    const nameInput = cardIdentity?.querySelector('.op-card__name');
    const coordFields = cardIdentity?.querySelectorAll('.coord-field');
    expect(nameInput).toBeTruthy();
    expect(coordFields).toHaveLength(2); // X and Y
  });

  it('places safe time controls at the bottom of the card', () => {
    const cardBottom = container.querySelector('.op-strip-card__bottom .op-safetime');
    expect(cardBottom).toBeTruthy();
    expect(cardBottom?.textContent).toContain('Safe Hours');
  });

  it('opens 3-faction unit grid picker and allows selecting a unit', () => {
    const trigger = container.querySelector('.unit-grid-picker__trigger') as HTMLElement;
    expect(trigger).toBeTruthy();
    click(trigger);

    const popover = document.querySelector('.unit-grid-popover');
    expect(popover).toBeTruthy();
    expect(popover?.textContent).toContain('Embermark Dominion');
    expect(popover?.textContent).toContain('Stormfang Clans');
    expect(popover?.textContent).toContain('Verdant Wardens');

    // Click another unit item in the popover
    const unitButtons = popover?.querySelectorAll('.unit-grid-item');
    expect(unitButtons && unitButtons.length).toBeGreaterThan(5);
    const shieldbearer = [...(unitButtons || [])].find((btn) => btn.textContent?.includes('Shieldbearer'));
    expect(shieldbearer).toBeTruthy();
    click(shieldbearer!);

    // Popover should close and trigger should update
    expect(document.querySelector('.unit-grid-popover')).toBeNull();
    expect(trigger.textContent).toContain('Shieldbearer');
  });

  it('adds villages under a defender player and shows the target coordinates and hit type in the route plan', () => {
    const addDefender = [...container.querySelectorAll('.op-section-head .pill--primary')].find(
      (b) => b.textContent?.includes('Add Defender'),
    ) as HTMLElement;
    expect(addDefender).toBeTruthy();
    click(addDefender);

    const groups = container.querySelectorAll('.op-target-group.is-player');
    expect(groups).toHaveLength(2); // Initial Defender 1 + Defender 2

    const group2 = groups[1] as HTMLElement;
    const addVillage = [...group2.querySelectorAll('.pill--tiny')].find(
      (b) => b.textContent?.includes('Village'),
    ) as HTMLElement;
    expect(addVillage).toBeTruthy();
    click(addVillage);
    expect(group2.textContent).toContain('2 villages');

    // Total 3 routes against single attacker
    const rows = [...container.querySelectorAll('.op-routes tbody tr')];
    expect(rows).toHaveLength(3);
    expect(container.textContent).toContain('3 real, 0 fake');
  });

  it('sorts routes chronologically by Send time and includes seconds in send timestamps', () => {
    const addVillageBtn = [...container.querySelectorAll('.op-target-group__actions .pill--tiny')].find(
      (b) => b.textContent?.includes('Village'),
    ) as HTMLElement;
    expect(addVillageBtn).toBeTruthy();
    click(addVillageBtn);

    const rows = [...container.querySelectorAll('.op-routes tbody tr')];
    expect(rows.length).toBe(2);
    const sendTimestamps = rows.map((r) => r.querySelector('.op-timestamp--send')?.textContent || '');
    expect(sendTimestamps.every((t) => /\d{2}:\d{2}:\d{2} UTC/.test(t))).toBe(true);

    const landTimestamps = rows.map((r) => r.querySelector('.op-timestamp--land')?.textContent || '');
    expect(landTimestamps.every((t) => /\d{2}:\d{2} UTC/.test(t) && !/\d{2}:\d{2}:\d{2} UTC/.test(t))).toBe(true);
  });

  it('selects a route when clicking anywhere on a row and highlights relevant schedule lanes', () => {
    const addAttackerBtn = [...container.querySelectorAll('.op-section-head .pill--primary')].find(
      (b) => b.textContent?.includes('Add Attacker'),
    ) as HTMLElement;
    expect(addAttackerBtn).toBeTruthy();
    click(addAttackerBtn);

    const rows = [...container.querySelectorAll('.op-routes tbody tr')];
    expect(rows.length).toBe(2);

    // Click the 2nd row anywhere
    click(rows[1]);

    expect(rows[1].classList.contains('is-selected')).toBe(true);
    expect(container.querySelector('.schedule__row.is-selected-lane')).toBeTruthy();
  });

  it('imports saved plan settings from URL hash correctly', () => {
    const rawPlan = JSON.stringify({
      landing: '2026-08-16T19:00',
      serverSpeed: 3,
      attackers: [
        {
          id: 'a1',
          name: 'DrDoughnut',
          x: 17,
          y: -25,
          unitRef: 'stormfang_clans/skullthrower',
          artifactMultiplier: 1,
          bannerfieldLevel: 9,
          safeEnabled: true,
          safeStart: '01:00',
          safeEnd: '07:00',
        },
        {
          id: 'ayhdwke',
          name: 'Jezu',
          x: 4,
          y: 34,
          unitRef: 'stormfang_clans/skullthrower',
          artifactMultiplier: 1,
          bannerfieldLevel: 0,
          safeEnabled: false,
          safeStart: '22:00',
          safeEnd: '04:00',
        },
      ],
      targets: [
        {
          id: 't1',
          name: 'Froggy G',
          x: -34,
          y: -31,
          safeEnabled: true,
          safeStart: '04:30',
          safeEnd: '10:30',
        },
        {
          id: 't7enqa8',
          name: 'Small cat',
          x: -35,
          y: -22,
          safeEnabled: true,
          safeStart: '04:30',
          safeEnd: '10:30',
        },
      ],
    });

    act(() => {
      window.location.hash = `#tool=operations&plan=${encodeURIComponent(rawPlan)}`;
      window.dispatchEvent(new Event('hashchange'));
    });

    expect(container.textContent).toContain('DrDoughnut');
    expect(container.textContent).toContain('Jezu');
    expect(container.textContent).toContain('Froggy G');
    expect(container.textContent).toContain('Small cat');
    expect(container.textContent.toLowerCase()).toContain('skullthrower');
  });

  it('decodes full custom user plan correctly from URL string', () => {
    const rawHash = '#tool=operations&plan=%7B%22landing%22%3A%222026-08-16T19%3A00%22%2C%22serverSpeed%22%3A3%2C%22attackers%22%3A%5B%7B%22id%22%3A%22a1%22%2C%22name%22%3A%22DrDoughnut%22%2C%22x%22%3A17%2C%22y%22%3A-25%2C%22unitRef%22%3A%22stormfang_clans%2Fskullthrower%22%2C%22artifactMultiplier%22%3A1%2C%22bannerfieldLevel%22%3A9%2C%22safeEnabled%22%3Atrue%2C%22safeStart%22%3A%2201%3A00%22%2C%22safeEnd%22%3A%2207%3A00%22%7D%2C%7B%22id%22%3A%22ayhdwke%22%2C%22name%22%3A%22Jezu%22%2C%22x%22%3A4%2C%22y%22%3A34%2C%22unitRef%22%3A%22stormfang_clans%2Fskullthrower%22%2C%22artifactMultiplier%22%3A1%2C%22bannerfieldLevel%22%3A0%2C%22safeEnabled%22%3Afalse%2C%22safeStart%22%3A%2222%3A00%22%2C%22safeEnd%22%3A%2204%3A00%22%7D%5D%2C%22targets%22%3A%5B%7B%22id%22%3A%22t1%22%2C%22name%22%3A%22Froggy+G%22%2C%22x%22%3A-34%2C%22y%22%3A-31%2C%22safeEnabled%22%3Atrue%2C%22safeStart%22%3A%2204%3A30%22%2C%22safeEnd%22%3A%2210%3A30%22%7D%2C%7B%22id%22%3A%22t7enqa8%22%2C%22name%22%3A%22Small+cat%22%2C%22x%22%3A-35%2C%22y%22%3A-22%2C%22safeEnabled%22%3Atrue%2C%22safeStart%22%3A%2204%3A30%22%2C%22safeEnd%22%3A%2210%3A30%22%7D%2C%7B%22id%22%3A%22tqp3lq9%22%2C%22name%22%3A%22Petrgon%22%2C%22x%22%3A-8%2C%22y%22%3A-46%2C%22safeEnabled%22%3Atrue%2C%22safeStart%22%3A%2222%3A45%22%2C%22safeEnd%22%3A%2204%3A00%22%7D%2C%7B%22id%22%3A%22t0ldztq%22%2C%22name%22%3A%22Dangerdoom%22%2C%22x%22%3A-42%2C%22y%22%3A-21%2C%22safeEnabled%22%3Atrue%2C%22safeStart%22%3A%2217%3A00%22%2C%22safeEnd%22%3A%2223%3A00%22%7D%5D%7D';
    const decoded = decodeState(rawHash);
    expect(decoded.landing).toBe('2026-08-16T19:00');
    expect(decoded.attackers).toHaveLength(2);
    expect(decoded.attackers[0].name).toBe('DrDoughnut');
    expect(decoded.attackers[0].x).toBe(17);
    expect(decoded.attackers[0].y).toBe(-25);
    expect(decoded.attackers[0].unitRef).toBe('stormfang_clans/skullthrower');
    expect(decoded.attackers[0].bannerfieldLevel).toBe(9);
    expect(decoded.attackers[0].safeStart).toBe('01:00');
    expect(decoded.attackers[0].safeEnd).toBe('07:00');
    expect(decoded.targets).toHaveLength(4);
    expect(decoded.targets[0].name).toBe('Froggy G');
    expect(decoded.targets[3].name).toBe('Dangerdoom');
  });

  it('imports compact plan string via hashchange', () => {
    const compact = 'v1_2026-08-16T19:00_3~a:DrDoughnut,17,-25,stormfang_clans/skullthrower,1,9,1,01:00-07:00~a:Jezu,4,34,stormfang_clans/skullthrower,1,0,0,22:00-04:00~t:Froggy+G,-34,-31,1,04:30-10:30~t:Dangerdoom,-42,-21,1,17:00-23:00';
    act(() => {
      window.location.hash = `#tool=operations&p=${encodeURIComponent(compact)}`;
      window.dispatchEvent(new Event('hashchange'));
    });

    expect(container.textContent).toContain('DrDoughnut');
    expect(container.textContent).toContain('Jezu');
    expect(container.textContent).toContain('Froggy G');
    expect(container.textContent).toContain('Dangerdoom');
  });

  it('selects route when clicking on attacker or defender timeline lane in daily schedule', () => {
    const compact = 'v1_2026-08-16T19:00_3~a:DrDoughnut,17,-25,stormfang_clans/skullthrower,1,9,1,01:00-07:00~a:Jezu,4,34,stormfang_clans/skullthrower,1,0,0,22:00-04:00~t:Froggy+G,-34,-31,1,04:30-10:30~t:Dangerdoom,-42,-21,1,17:00-23:00';
    act(() => {
      window.location.hash = `#tool=operations&p=${encodeURIComponent(compact)}`;
      window.dispatchEvent(new Event('hashchange'));
    });

    // Find the schedule section and verify initial selected route
    const schedule = container.querySelector('.op-schedule')!;
    expect(schedule).toBeTruthy();
    expect(schedule.textContent).toContain('Daily safe-time schedule · UTC');

    // Click on Dangerdoom (Defender 2) lane inside the schedule
    const defenderLanes = Array.from(schedule.querySelectorAll('.schedule__row--defender.schedule__row--interactive'));
    const dangerdoomLane = defenderLanes.find((el) => el.textContent?.includes('Dangerdoom')) as HTMLElement;
    expect(dangerdoomLane).toBeTruthy();

    act(() => {
      dangerdoomLane.click();
    });

    expect(dangerdoomLane.classList.contains('is-selected-lane')).toBe(true);
  });

  it('filters route plans by Attacker, Target, Viability status, and Attack type', () => {
    const compact = 'v1_2026-08-16T19:00_3~a:DrDoughnut,17,-25,stormfang_clans/skullthrower,1,9,1,01:00-07:00~a:Jezu,4,34,stormfang_clans/skullthrower,1,0,0,22:00-04:00~t:Froggy+G,-34,-31,1,04:30-10:30~t:Dangerdoom,-42,-21,1,17:00-23:00';
    act(() => {
      window.location.hash = `#tool=operations&p=${encodeURIComponent(compact)}`;
      window.dispatchEvent(new Event('hashchange'));
    });

    expect(container.querySelectorAll('.op-routes tbody tr')).toHaveLength(4);

    // Filter by Attacker: DrDoughnut
    const attackerFilter = container.querySelectorAll('.op-select-filter')[0] as HTMLSelectElement;
    expect(attackerFilter).toBeTruthy();
    act(() => {
      attackerFilter.value = 'a1';
      attackerFilter.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.querySelectorAll('.op-routes tbody tr')).toHaveLength(2);

    // Reset filter
    act(() => {
      attackerFilter.value = 'all';
      attackerFilter.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.querySelectorAll('.op-routes tbody tr')).toHaveLength(4);

    // Filter by Viability: Blocked only
    const blockedBtn = container.querySelector('.pill--blocked-filter') as HTMLElement;
    expect(blockedBtn).toBeTruthy();
    click(blockedBtn);
    const blockedRows = container.querySelectorAll('.op-routes tbody tr');
    expect(blockedRows.length).toBeGreaterThan(0);
    expect(Array.from(blockedRows).every((r) => r.classList.contains('is-blocked'))).toBe(true);
  });

  it('renders countdown ticker, alarm chime controls, and army selector', () => {
    expect(container.querySelector('.op-alarm-toolbar')).toBeTruthy();
    const alarmBtn = container.querySelector('.pill--alarm') as HTMLElement;
    expect(alarmBtn).toBeTruthy();
    expect(alarmBtn.textContent).toContain('Alarm: ON');

    // Designated alarm army dropdown selector
    const alarmSelect = container.querySelector('.op-alarm-select') as HTMLSelectElement;
    expect(alarmSelect).toBeTruthy();
    expect(alarmSelect.value).toBe('all');

    // Toggle mute
    click(alarmBtn);
    expect(alarmBtn.textContent).toContain('Alarm: Muted');

    // Launch In column in table header
    const ths = Array.from(container.querySelectorAll('.op-routes th')).map((th) => th.textContent);
    expect(ths).toContain('Launch In');
    expect(container.querySelector('.op-countdown-tag')).toBeTruthy();
  });

  it('keeps Team Room bar hidden in v1, and unlocks Top Secret v2 mode after clicking Operation Planner tab 10 times', () => {
    const opTab = [...container.querySelectorAll('.pill--tool')].find(
      (b) => b.getAttribute('aria-label') === 'Operation Planner',
    )!;
    expect(opTab).toBeTruthy();

    // Initially hidden in v1
    expect(container.querySelector('.op-team-room-bar')).toBeNull();

    // Click 10 times on the Operation Planner tab
    for (let i = 0; i < 10; i++) {
      click(opTab);
    }

    // Modal pops up with classified animation & title
    const secretModal = container.querySelector('.secret-modal-card');
    expect(secretModal).toBeTruthy();
    expect(secretModal?.textContent).toContain('Top Secret Planner v2 Unlocked');
    expect(secretModal?.textContent).toContain('CLASSIFIED PROTOCOL');

    // Enter room passcode in the modal and submit
    const modalInput = container.querySelector('.secret-modal-input') as HTMLInputElement;
    expect(modalInput).toBeTruthy();
    setInputValue(modalInput, 'password123');
    const connectBtn = container.querySelector('.secret-modal-btn-connect') as HTMLButtonElement;
    click(connectBtn);

    // Now unlocked on page!
    const roomBar = container.querySelector('.op-team-room-bar');
    expect(roomBar).toBeTruthy();
    expect(roomBar?.textContent).toContain('Team Room');
    expect(roomBar?.textContent).toContain('Zero-Knowledge AES-256');

    const input = container.querySelector('.op-team-room-input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(container.textContent).toContain('v2 Secret');
  });

  it('toggles attackers and targets between active and benched states, updating route count in v2 mode', async () => {
    const opTab = [...container.querySelectorAll('.pill--tool')].find(
      (b) => b.getAttribute('aria-label') === 'Operation Planner',
    )!;
    for (let i = 0; i < 10; i++) {
      click(opTab);
    }
    const modalInput = container.querySelector('.secret-modal-input') as HTMLInputElement;
    if (modalInput) {
      setInputValue(modalInput, 'password123');
      const connectBtn = container.querySelector('.secret-modal-btn-connect') as HTMLButtonElement;
      click(connectBtn);
    }

    const roomInput = container.querySelector('.op-team-room-input') as HTMLInputElement;
    if (roomInput) {
      setInputValue(roomInput, 'password123');
      const roomConnectBtn = container.querySelector('.op-team-room-form button') as HTMLButtonElement;
      if (roomConnectBtn) click(roomConnectBtn);
    }

    const start = Date.now();
    while (!container.querySelector('.op-participant-chip--attacker')) {
      if (Date.now() - start > 1500) break;
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });
    }

    // Initially 1 attacker and 1 target -> 1 route
    expect(container.querySelectorAll('.op-routes tbody .op-route-row')).toHaveLength(1);

    // Bench the first attacker using the participant chip checkbox
    const attackerChip = container.querySelector('.op-participant-chip--attacker input[type="checkbox"]') as HTMLInputElement;
    expect(attackerChip).toBeTruthy();
    expect(attackerChip.checked).toBe(true);

    act(() => {
      attackerChip.click();
    });

    // With 0 active attackers, 0 route rows are generated (empty state shows)
    expect(container.querySelectorAll('.op-routes tbody .op-route-row')).toHaveLength(0);
    expect(container.querySelector('.op-routes-empty')).toBeTruthy();

    // Re-activate the attacker
    act(() => {
      attackerChip.click();
    });
    expect(container.querySelectorAll('.op-routes tbody .op-route-row')).toHaveLength(1);
  });

  it('supports toggling auto-save and warns on sync when unsaved changes exist in v2 mode', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: null }),
    });

    try {
      const opTab = [...container.querySelectorAll('.pill--tool')].find(
        (b) => b.getAttribute('aria-label') === 'Operation Planner',
      )!;
      for (let i = 0; i < 10; i++) {
        click(opTab);
      }

      const modalInput = container.querySelector('.secret-modal-input') as HTMLInputElement;
      if (modalInput) {
        setInputValue(modalInput, 'password123');
        const connectBtn = container.querySelector('.secret-modal-btn-connect') as HTMLButtonElement;
        click(connectBtn);
      }

      const roomInput = container.querySelector('.op-team-room-input') as HTMLInputElement;
      if (roomInput) {
        setInputValue(roomInput, 'password123');
        const roomConnectBtn = container.querySelector('.op-team-room-form button') as HTMLButtonElement;
        if (roomConnectBtn) click(roomConnectBtn);
      }

      // Wait for room connection to resolve and show active controls
      const start = Date.now();
      while (!container.querySelector('.op-plan-tab-add')) {
        if (Date.now() - start > 1500) break;
        await act(async () => {
          await new Promise((r) => setTimeout(r, 20));
        });
      }

      // Auto-save toggle button
      const autoSaveBtn = [...container.querySelectorAll('.op-team-room-actions button')].find(
        (b) => b.textContent?.includes('Auto-Save'),
      ) as HTMLElement;
      expect(autoSaveBtn).toBeTruthy();
      expect(autoSaveBtn.textContent).toContain('Auto-Save: OFF');

      click(autoSaveBtn);
      // Duplicate active operation tab (creates unsaved local change)
      const duplicateBtn = [...container.querySelectorAll('.op-plan-tab__btn')].find(
        (b) => b.getAttribute('title')?.includes('Duplicate') || b.textContent?.includes('📑'),
      ) as HTMLElement;
      expect(duplicateBtn).toBeTruthy();
      click(duplicateBtn);

      // Dirty badge should display
      expect(container.textContent).toContain('Unsaved Local Changes');

      // Clicking Sync should open overwrite safety modal
      const syncBtn = [...container.querySelectorAll('.op-team-room-actions button')].find(
        (b) => b.textContent?.includes('Sync'),
      ) as HTMLElement;
      expect(syncBtn).toBeTruthy();
      click(syncBtn);

      const safetyModal = container.querySelector('.op-modal.op-modal--compact');
      expect(safetyModal).toBeTruthy();
      expect(safetyModal?.textContent).toContain('Unsaved Local Changes');
      expect(safetyModal?.textContent).toContain('Pulling from the cloud will overwrite your local changes');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('the CP optimizer tool', () => {
  beforeEach(() => {
    const optTab = [...container.querySelectorAll('.pill--tool')].find(
      (b) => b.getAttribute('aria-label') === 'CP Optimizer',
    )!;
    click(optTab);
  });

  it('renders village settings, live metrics, current buildings, and recommendations', () => {
    expect(window.location.hash).toContain('tool=optimizer');
    expect(container.textContent).toContain('Culture Point Build-Order Optimizer');
    expect(container.textContent).toContain('Daily CP Production');
    expect(container.textContent).toContain('Shared Building Slots');
    expect(container.textContent).toContain('Recommended Build Order');

    // Initial building: Town Hall Lvl 1
    expect(container.querySelectorAll('.cp-building-row')).toHaveLength(1);
    expect(container.textContent).toContain('Town Hall');

    // Recommendations list
    const recCards = container.querySelectorAll('.cp-rec-card');
    expect(recCards.length).toBeGreaterThan(0);
  });

  it('applies a recommendation to current village buildings when clicking build', () => {
    const initialRecs = container.querySelectorAll('.cp-rec-card');
    expect(initialRecs.length).toBeGreaterThan(0);

    const firstBuildBtn = container.querySelector('.cp-build-btn') as HTMLElement;
    expect(firstBuildBtn).toBeTruthy();

    click(firstBuildBtn);

    // After building, buildings list should have updated or expanded
    const buildingRows = container.querySelectorAll('.cp-building-row');
    expect(buildingRows.length).toBeGreaterThanOrEqual(1);
  });

  it('updates daily CP metrics when adjusting average field level or city status', () => {
    const initialCpText = container.querySelector('.cp-stat-card__val')?.textContent || '';

    // Toggle City
    const cityBtn = [...container.querySelectorAll('.cp-setting-item--toggles .pill--toggle')].find(
      (b) => b.textContent?.includes('City'),
    ) as HTMLElement;
    expect(cityBtn).toBeTruthy();
    click(cityBtn);

    const updatedCpText = container.querySelector('.cp-stat-card__val')?.textContent || '';
    expect(updatedCpText).not.toBe(initialCpText);
  });

  it('loads shared village configuration from URL hash', () => {
    const compact = 'v1_Stronghold%201,stormfang_clans,1,5,2~b:15,5~b:24,2';
    act(() => {
      window.location.hash = `#tool=optimizer&v=${encodeURIComponent(compact)}`;
      window.dispatchEvent(new Event('hashchange'));
    });

    expect(container.textContent).toContain('Stronghold 1');
    expect(container.textContent).toContain('Town Hall');
  });

  it('supports adding and reordering villages in the vertical sidebar', () => {
    const addBtn = container.querySelector('.cp-sidebar .pill--primary') as HTMLElement;
    expect(addBtn).toBeTruthy();

    click(addBtn);

    // Should now have 2 villages in sidebar
    const villageCards = container.querySelectorAll('.cp-village-card-v');
    expect(villageCards.length).toBe(2);

    // Reorder button: move second village up
    const reorderBtns = container.querySelectorAll('.cp-reorder-btn');
    expect(reorderBtns.length).toBeGreaterThan(0);
  });

  it('switches between CP Optimizer Mode and Population Optimizer Mode', () => {
    // Initial: CP Mode
    expect(container.textContent).toContain('Culture Point Build-Order Optimizer');
    expect(container.textContent).toContain('Daily CP Production');
    expect(container.textContent).toContain('res/CP');

    // Switch to Population Mode
    const popModeBtn = [...container.querySelectorAll('.cp-header-controls .pill')].find(
      (b) => b.textContent?.includes('Pop Mode')
    ) as HTMLElement;
    expect(popModeBtn).toBeTruthy();
    click(popModeBtn);

    // Assert Population Mode UI
    expect(container.textContent).toContain('Population Build-Order Optimizer');
    expect(container.textContent).toContain('Total Village Population');
    expect(container.textContent).toContain('res/Pop');

    // Switch back to CP Mode
    const cpModeBtn = [...container.querySelectorAll('.cp-header-controls .pill')].find(
      (b) => b.textContent?.includes('CP Mode')
    ) as HTMLElement;
    expect(cpModeBtn).toBeTruthy();
    click(cpModeBtn);

    // Assert CP Mode UI restored
    expect(container.textContent).toContain('Culture Point Build-Order Optimizer');
    expect(container.textContent).toContain('Daily CP Production');
    expect(container.textContent).toContain('res/CP');
  });

  it('enforces a single capital rule when adding villages and designating new capitals', () => {
    const initialCards = container.querySelectorAll('.cp-village-card-v');
    const initialCount = initialCards.length;

    // Add a new village
    const addBtn = container.querySelector('.cp-sidebar .pill--primary') as HTMLElement;
    click(addBtn);

    const villageCards = container.querySelectorAll('.cp-village-card-v');
    expect(villageCards).toHaveLength(initialCount + 1);

    // Newly added village is active and Non-Capital (Residence)
    const newCard = villageCards[villageCards.length - 1];
    expect(newCard.textContent).toContain('Residence');

    // Click "Make Capital" on the new village
    const makeCapBtn = [...container.querySelectorAll('.cp-setting-item--toggles .pill--toggle')].find(
      (b) => b.textContent?.includes('Capital')
    ) as HTMLElement;
    expect(makeCapBtn).toBeTruthy();
    click(makeCapBtn);

    // Now the new village is Capital (Palace) and the previous capital is Non-Capital (Residence)
    const updatedCards = container.querySelectorAll('.cp-village-card-v');
    expect(updatedCards[updatedCards.length - 1].textContent).toContain('Palace');
    expect(updatedCards[0].textContent).toContain('Residence');
  });

  it('updates building level directly via the dropdown selector', () => {
    const select = container.querySelector('.cp-level-select') as HTMLSelectElement;
    expect(select).toBeTruthy();

    act(() => {
      select.value = '15';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const updatedSelect = container.querySelector('.cp-level-select') as HTMLSelectElement;
    expect(updatedSelect.value).toBe('15');
  });

  it('renders infinity efficiency badges without large sentinel numbers or div-by-zero errors', () => {
    // Switch to Pop Mode
    const popModeBtn = [...container.querySelectorAll('.cp-header-controls .pill')].find(
      (b) => b.textContent?.includes('Pop Mode')
    ) as HTMLElement;
    click(popModeBtn);

    // Make sure no 999999 or NaN shows up in badges
    const badges = Array.from(container.querySelectorAll('.cp-efficiency-badge')).map((b) => b.textContent);
    expect(badges.some((t) => t?.includes('999999'))).toBe(false);
    expect(badges.some((t) => t?.includes('NaN'))).toBe(false);
  });

  it('updates slot capacity to 23 when converting village to City and expands city building max level to 22', () => {
    // Normal village has 20 base shared slots
    expect(container.textContent).toContain('20');

    // Click "City" toggle
    const cityBtn = [...container.querySelectorAll('.cp-setting-item--toggles .pill--toggle')].find(
      (b) => b.textContent?.includes('City')
    ) as HTMLElement;
    expect(cityBtn).toBeTruthy();
    click(cityBtn);

    // City gets +3 extra slots (20 + 3 = 23)
    expect(container.textContent).toContain('23');

    // Add Warehouse to active village
    const addBtn = container.querySelector('.cp-buildings-panel .pill--primary') as HTMLElement;
    click(addBtn);

    const whBtn = [...container.querySelectorAll('.cp-picker-card')].find(
      (b) => b.textContent?.includes('Warehouse')
    ) as HTMLElement;
    expect(whBtn).toBeTruthy();
    click(whBtn);

    // In a city, Warehouse level selector offers up to Level 22
    const levelSelects = container.querySelectorAll('.cp-level-select');
    const whSelect = levelSelects[levelSelects.length - 1] as HTMLSelectElement;
    expect(whSelect).toBeTruthy();
    const options = Array.from(whSelect.options).map((o) => o.value);
    expect(options).toContain('22');
  });

  it('calculates and displays Village and Empire Networth in the CP optimizer overview', () => {
    expect(container.textContent).toContain('Village Networth');
    expect(container.textContent).toContain('res');
    expect(container.textContent).toContain('Empire:');
  });
});

describe('the Building Stats tool', () => {
  beforeEach(() => {
    const bldgTab = [...container.querySelectorAll('.pill--tool')].find(
      (b) => b.getAttribute('aria-label') === 'Building Stats',
    )!;
    click(bldgTab);
  });

  it('renders 3 horizontal category columns, search input, and building cards', () => {
    expect(window.location.hash).toContain('tool=buildings');
    expect(container.textContent).toContain('Building Stats');
    expect(container.textContent).toContain('Resources');
    expect(container.textContent).toContain('Infrastructure');
    expect(container.textContent).toContain('Military');

    // All building cards exist
    const cards = container.querySelectorAll('.bs-card');
    expect(cards.length).toBeGreaterThan(30);
  });

  it('opens modal dialog with stats table when clicking a card in the grid and closes it with the close button', () => {
    const whCard = [...container.querySelectorAll('.bs-card')].find(
      (c) => c.textContent?.includes('Warehouse')
    ) as HTMLElement;
    expect(whCard).toBeTruthy();
    click(whCard);

    expect(window.location.hash).toContain('b=warehouse');
    expect(container.querySelector('.bs-modal-content')).toBeTruthy();
    expect(container.querySelector('.bs-hero__title')?.textContent).toBe('Warehouse');
    expect(container.textContent).toContain('Town Hall:');
    expect(container.textContent).toContain('Wood');
    expect(container.textContent).toContain('Total Cost');

    // Table rows exist in modal
    const rows = container.querySelectorAll('.bs-table tbody tr');
    expect(rows.length).toBe(22); // Warehouse has 22 levels

    // Close modal
    const closeBtn = container.querySelector('.bs-modal-close') as HTMLElement;
    expect(closeBtn).toBeTruthy();
    click(closeBtn);
    expect(container.querySelector('.bs-modal-content')).toBeNull();
  });
});

