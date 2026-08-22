// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BuildingStats } from './BuildingStats';
import { getTownHallFactor, formatTimeSeconds, formatEffectLabel, describePrerequisites } from '../data/buildingEffects';
import { BUILDINGS, BUILDINGS_BY_GID } from '../data/buildingCatalog';
import { TOWN_HALL_GID, FESTIVAL_GROUNDS_GID } from '../engine/cpOptimizer';

let container: HTMLDivElement;
let root: Root;

const click = (el: Element) =>
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

const changeInput = (input: HTMLInputElement | HTMLSelectElement, value: string) => {
  act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      input instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLSelectElement.prototype,
      'value'
    )?.set;
    if (valueSetter) {
      valueSetter.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

describe('BuildingStats Component & Effect Helpers', () => {
  beforeEach(() => {
    window.location.hash = '#tool=buildings&b=town-hall&th=20';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<BuildingStats />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.location.hash = '';
  });

  it('renders default building modal (Town Hall / GID 15) with hero details, aggregate stats, and level 22 progression', () => {
    expect(container.textContent).toContain('Town Hall');
    expect(container.textContent).toContain('Infrastructure');
    expect(container.textContent).toContain('City Upgradeable (Lvl 22)');

    // Check table headers
    expect(container.textContent).toContain('Wood');
    expect(container.textContent).toContain('Clay');
    expect(container.textContent).toContain('Iron');
    expect(container.textContent).toContain('Crop');

    // Town Hall should show levels 1 to 22
    expect(container.textContent).toContain('Lvl 1');
    expect(container.textContent).toContain('Lvl 20');
    expect(container.textContent).toContain('Lvl 21');
    expect(container.textContent).toContain('Lvl 22');

    // Level 22 CP for Town Hall is 110 (from Thronewake game bundle)
    expect(container.textContent).toContain('+110');
  });

  it('displays all 3 categories (Resources, Infrastructure, Military) horizontally with all buildings visible', () => {
    expect(container.textContent).toContain('Resources');
    expect(container.textContent).toContain('Infrastructure');
    expect(container.textContent).toContain('Military');

    const cardNames = Array.from(container.querySelectorAll('.bs-card__name')).map((c) => c.textContent);
    expect(cardNames).toContain('Woodcutter');
    expect(cardNames).toContain('Town Hall');
    expect(cardNames).toContain('Festival Grounds');
    expect(cardNames).toContain('Barracks');
    expect(cardNames.length).toBe(BUILDINGS.length);
  });

  it('filters buildings live by search text', () => {
    const searchInput = container.querySelector('.bs-search-input') as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    changeInput(searchInput, 'Granary');

    const cardNames = Array.from(container.querySelectorAll('.bs-card__name')).map((c) => c.textContent);
    expect(cardNames).toContain('Granary');
    expect(cardNames).toContain('Great Granary');
    expect(cardNames).not.toContain('Barracks');
  });

  it('supports selecting level ranges via 3-click table row cycle and dynamically recalculates total costs', () => {
    // Initial state: Level 0 -> 22 (full)
    expect(container.textContent).toContain('Total Cost (Lvl 0 → 22)');

    const rows = container.querySelectorAll('.bs-table tbody tr');

    // 1st click: Click Level 5 (Row index 4) -> selects Level 4 -> 5 (just Level 5)
    click(rows[4]);
    expect(container.textContent).toContain('Total Cost (Lvl 4 → 5)');
    expect(container.querySelectorAll('.bs-tr.is-in-range').length).toBe(1);

    // 2nd click: Click Level 10 (Row index 9) -> selects range Level 4 -> 10 (Levels 5 through 10)
    click(rows[9]);
    expect(container.textContent).toContain('Total Cost (Lvl 4 → 10)');
    expect(container.querySelectorAll('.bs-tr.is-in-range').length).toBe(6);

    // 3rd click: Click any row -> resets back to full (Level 0 -> 22)
    click(rows[0]);
    expect(container.textContent).toContain('Total Cost (Lvl 0 → 22)');
    expect(container.querySelectorAll('.bs-tr.is-in-range').length).toBe(0);
  });

  it('dynamically scales construction time when adjusting Town Hall slider and Server Speed', () => {
    const slider = container.querySelector('.bs-mb-slider') as HTMLInputElement;
    expect(slider).toBeTruthy();

    changeInput(slider, '1');

    expect(container.textContent).toContain('Lvl 1');
    expect(container.textContent).toContain('100% Speed (100.0% time)');

    // Speed 3x
    const speed3Btn = [...container.querySelectorAll('.bs-speed-btn')].find(
      (b) => b.textContent?.includes('3x')
    ) as HTMLElement;
    expect(speed3Btn).toBeTruthy();
    click(speed3Btn);

    expect(speed3Btn.classList.contains('is-selected')).toBe(true);
    expect(container.textContent).toContain('3x Speed');
  });

  it('selects Festival Grounds (GID 24) when clicking its card or mobile dropdown', () => {
    const fgCard = [...container.querySelectorAll('.bs-card')].find(
      (c) => c.textContent?.includes('Festival Grounds')
    ) as HTMLElement;
    expect(fgCard).toBeTruthy();
    click(fgCard);

    expect(container.querySelector('.bs-hero__title')?.textContent).toBe('Festival Grounds');
    expect(container.textContent).toContain('Small Party:');
    // Festival Grounds is max level 20 (not level 22)
    expect(container.textContent).toContain('Max Level: 20');

    // Switch via mobile dropdown
    const select = container.querySelector('.bs-mobile-picker__select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    changeInput(select, '10'); // Warehouse GID 10

    expect(container.querySelector('.bs-hero__title')?.textContent).toBe('Warehouse');
  });

  it('correctly calculates Town Hall speed reduction factors and time formatting', () => {
    expect(getTownHallFactor(1)).toBe(1.0);
    expect(Number(getTownHallFactor(20).toFixed(3))).toBe(0.498);
    expect(Number(getTownHallFactor(22).toFixed(3))).toBe(0.463);

    expect(formatTimeSeconds(45)).toBe('45s');
    expect(formatTimeSeconds(125)).toBe('2m 5s');
    expect(formatTimeSeconds(3665)).toBe('1h 1m 5s');
    expect(formatTimeSeconds(90000)).toBe('1d 1h 0m');
    expect(formatTimeSeconds(0)).toBe('Instant');
    expect(formatTimeSeconds(null)).toBe('Instant');
  });

  it('formats building effects cleanly and scales traps and production by server speed', () => {
    expect(formatEffectLabel('storageWarehouse', 80000, 1)).toBe('80,000 Resource Capacity');
    expect(formatEffectLabel('production1', 500, 3)).toBe('+1,500 Wood/hr');
    expect(formatEffectLabel('traps', 400, 3)).toBe('1,200 Traps');
    expect(formatEffectLabel('productionBoost1', 0.25)).toBe('+25% Wood Production');
    expect(formatEffectLabel('trainingTimeBarracks', 0.135)).toBe('13.5% Training Time');
    expect(formatEffectLabel('healTime', 0.068)).toBe('6.8% Healing Time');
    expect(formatEffectLabel('woundedCapacity', 9563)).toBe('9,563 Wounded Capacity');
    expect(formatEffectLabel('merchants', 0)).toBe('');

    const emb = BUILDINGS_BY_GID.get(18)!;
    expect(emb.levels[0].effects?.merchants).toBeUndefined();
  });

  it('describes prerequisites accurately using lore factions', () => {
    const th = BUILDINGS_BY_GID.get(TOWN_HALL_GID)!;
    const prereqs = describePrerequisites(th);
    expect(Array.isArray(prereqs)).toBe(true);

    const fg = BUILDINGS_BY_GID.get(FESTIVAL_GROUNDS_GID)!;
    const fgPrereqs = describePrerequisites(fg);
    expect(fgPrereqs.some((p) => p.includes('Town Hall') || p.includes('Academy'))).toBe(true);
  });
});
