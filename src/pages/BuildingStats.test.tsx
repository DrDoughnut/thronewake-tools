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

  it('renders default building (Town Hall / GID 15) with hero details, aggregate stats, and level 22 progression', () => {
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

    // Level 22 CP for Town Hall is 138
    expect(container.textContent).toContain('+138');
  });

  it('displays all 3 categories (Resources, Infrastructure, Military) with all buildings visible simultaneously', () => {
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

  it('supports selecting level ranges and dynamically recalculates total resource costs and build times', () => {
    // Preset: Level 0 -> 10
    const p10Btn = [...container.querySelectorAll('.bs-range-presets .pill')].find(
      (b) => b.textContent?.includes('Lvl 0 → 10')
    ) as HTMLElement;
    expect(p10Btn).toBeTruthy();
    click(p10Btn);

    expect(container.textContent).toContain('Total Cost (Lvl 0 → 10)');

    // In-range table rows are highlighted
    const highlightedRows = container.querySelectorAll('.bs-tr.is-in-range');
    expect(highlightedRows.length).toBe(10);

    // Clicking a row in the table sets the range
    const row5 = container.querySelectorAll('.bs-tr')[4] as HTMLElement; // Lvl 5
    click(row5);

    expect(container.textContent).toContain('Total Cost (Lvl 0 → 5)');
  });

  it('dynamically scales construction time when adjusting Town Hall slider and Server Speed', () => {
    const slider = container.querySelector('.bs-mb-slider') as HTMLInputElement;
    expect(slider).toBeTruthy();

    changeInput(slider, '1');

    expect(container.textContent).toContain('Lvl 1');
    expect(container.textContent).toContain('100% Speed (100.0% time)');

    // Speed 3x
    const speed3Btn = [...container.querySelectorAll('.bs-speed-buttons .pill')].find(
      (b) => b.textContent?.includes('3x')
    ) as HTMLElement;
    expect(speed3Btn).toBeTruthy();
    click(speed3Btn);

    expect(container.textContent).toContain('3x Speed');
  });

  it('selects Festival Grounds (GID 24) when clicking its card', () => {
    const fgCard = [...container.querySelectorAll('.bs-card')].find(
      (c) => c.textContent?.includes('Festival Grounds')
    ) as HTMLElement;
    expect(fgCard).toBeTruthy();
    click(fgCard);

    expect(container.querySelector('.bs-hero__title')?.textContent).toBe('Festival Grounds');
    expect(container.textContent).toContain('Small Party:');
    // Festival Grounds is max level 20 (not level 22)
    expect(container.textContent).toContain('Max Level: 20');
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

  it('formats building effects cleanly and suppresses empty merchant counters on Embassy', () => {
    expect(formatEffectLabel('storageWarehouse', 80000)).toBe('80,000 Resource Capacity');
    expect(formatEffectLabel('production1', 500)).toBe('+500 Wood/hr');
    expect(formatEffectLabel('productionBoost1', 0.25)).toBe('+25% Wood Production');
    expect(formatEffectLabel('trainingTimeBarracks', 0.135)).toBe('13.5% Training Time');
    expect(formatEffectLabel('traps', 400)).toBe('400 Traps');
    expect(formatEffectLabel('merchants', 0)).toBe('');

    const emb = BUILDINGS_BY_GID.get(18)!;
    expect(emb.levels[0].effects?.merchants).toBeUndefined();
  });

  it('describes prerequisites accurately for Town Hall and other structures', () => {
    const th = BUILDINGS_BY_GID.get(TOWN_HALL_GID)!;
    const prereqs = describePrerequisites(th);
    expect(Array.isArray(prereqs)).toBe(true);

    const fg = BUILDINGS_BY_GID.get(FESTIVAL_GROUNDS_GID)!;
    const fgPrereqs = describePrerequisites(fg);
    expect(fgPrereqs.some((p) => p.includes('Town Hall') || p.includes('Academy'))).toBe(true);
  });
});
