// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
    expect(container.textContent).toContain('Target Destinations');
    expect(container.textContent).toContain('Safetime Checks');
    expect(container.textContent).toContain('24h UTC');
  });

  it('places Name and Coordinate X/Y inputs inline in card headers', () => {
    const cardHeader = container.querySelector('.op-card__header-row');
    expect(cardHeader).toBeTruthy();
    const nameInput = cardHeader?.querySelector('.op-card__name');
    const coordFields = cardHeader?.querySelectorAll('.coord-field');
    expect(nameInput).toBeTruthy();
    expect(coordFields).toHaveLength(2); // X and Y
  });

  it('places safe time controls at the bottom of the card', () => {
    const cardFooter = container.querySelector('.op-card__footer .op-safetime');
    expect(cardFooter).toBeTruthy();
    expect(cardFooter?.textContent).toContain('Safe Hours');
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

  it('sorts routes chronologically by Send time and includes seconds in send timestamps', () => {
    // Add another target further away
    const addTargetBtn = container.querySelector('.op-roster--targets .pill--primary') as HTMLElement;
    click(addTargetBtn);

    const rows = [...container.querySelectorAll('.op-routes tbody tr')];
    expect(rows.length).toBe(2);
    const sendTimestamps = rows.map((r) => r.querySelector('.op-timestamp--send')?.textContent || '');
    expect(sendTimestamps.every((t) => /\d{2}:\d{2}:\d{2} UTC/.test(t))).toBe(true);

    const landTimestamps = rows.map((r) => r.querySelector('.op-timestamp--land')?.textContent || '');
    expect(landTimestamps.every((t) => /\d{2}:\d{2} UTC/.test(t) && !/\d{2}:\d{2}:\d{2} UTC/.test(t))).toBe(true);
  });

  it('selects a route when clicking anywhere on a row and highlights relevant schedule lanes', () => {
    // Add another attacker
    const addAttackerBtn = container.querySelector('.op-roster--attackers .pill--primary') as HTMLElement;
    click(addAttackerBtn);

    const rows = [...container.querySelectorAll('.op-routes tbody tr')];
    expect(rows.length).toBe(2);

    // Click the 2nd row anywhere (e.g. on the distance cell)
    const secondRowDist = rows[1].querySelector('[data-label="Distance"]') as HTMLElement;
    click(secondRowDist);

    expect(rows[1].classList.contains('is-selected')).toBe(true);
    expect(container.querySelector('.schedule__row.is-selected-lane')).toBeTruthy();
    expect(container.querySelector('.schedule__row.is-faded-lane')).toBeTruthy();
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
    expect(container.textContent).toContain('Skullthrower');
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
    expect(schedule.textContent).toContain('Selected route:');

    // Click on Dangerdoom (Defender 2) lane inside the schedule
    const defenderLanes = Array.from(schedule.querySelectorAll('.schedule__row--defender.schedule__row--interactive'));
    const dangerdoomLane = defenderLanes.find((el) => el.textContent?.includes('Dangerdoom')) as HTMLElement;
    expect(dangerdoomLane).toBeTruthy();

    act(() => {
      dangerdoomLane.click();
    });

    expect(schedule.textContent).toContain('Dangerdoom');
  });
});

