// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BuildingStats } from './BuildingStats';
import { getMainBuildingFactor, formatTimeSeconds, formatEffectLabel, describePrerequisites } from '../data/buildingEffects';
import { BUILDINGS_BY_GID } from '../data/buildingCatalog';

let container: HTMLDivElement;
let root: Root;

const click = (el: Element) =>
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

const changeInput = (input: HTMLInputElement, value: string) => {
  act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
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
    window.location.hash = '#tool=buildings&b=town-hall&mb=20';
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

  it('renders default building (Town Hall) with hero details, aggregate stats, and level 22 progression', () => {
    expect(container.textContent).toContain('Town Hall');
    expect(container.textContent).toContain('Infrastructure');
    expect(container.textContent).toContain('City Upgradeable (Lvl 22)');

    // Check table headers
    expect(container.textContent).toContain('🪵 Wood');
    expect(container.textContent).toContain('🧱 Clay');
    expect(container.textContent).toContain('⛏️ Iron');
    expect(container.textContent).toContain('🌾 Crop');

    // Town Hall should show levels 1 to 22
    expect(container.textContent).toContain('Lvl 1');
    expect(container.textContent).toContain('Lvl 20');
    expect(container.textContent).toContain('Lvl 21');
    expect(container.textContent).toContain('Lvl 22');

    // Level 22 CP for Town Hall is 138
    expect(container.textContent).toContain('+138');
  });

  it('filters buildings by category when clicking category tabs', () => {
    const resTab = [...container.querySelectorAll('.bs-filter-tabs .pill')].find(
      (b) => b.textContent?.includes('Resources')
    ) as HTMLElement;
    expect(resTab).toBeTruthy();
    click(resTab);

    // Should display Woodcutter and Clay Pit, but not Town Hall
    const cardNames = Array.from(container.querySelectorAll('.bs-card__name')).map((c) => c.textContent);
    expect(cardNames).toContain('Woodcutter');
    expect(cardNames).toContain('Clay Pit');
    expect(cardNames).not.toContain('Town Hall');

    // Click "Military" category tab
    const milTab = [...container.querySelectorAll('.bs-filter-tabs .pill')].find(
      (b) => b.textContent?.includes('Military')
    ) as HTMLElement;
    expect(milTab).toBeTruthy();
    click(milTab);

    const milNames = Array.from(container.querySelectorAll('.bs-card__name')).map((c) => c.textContent);
    expect(milNames).toContain('Barracks');
    expect(milNames).toContain('Stable');
  });

  it('filters buildings by search text', () => {
    const searchInput = container.querySelector('.bs-search-input') as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    changeInput(searchInput, 'Granary');

    const cardNames = Array.from(container.querySelectorAll('.bs-card__name')).map((c) => c.textContent);
    expect(cardNames).toContain('Granary');
    expect(cardNames).toContain('Great Granary');
    expect(cardNames).not.toContain('Barracks');
  });

  it('dynamically scales construction time when adjusting Main Building slider', () => {
    const slider = container.querySelector('.bs-mb-slider') as HTMLInputElement;
    expect(slider).toBeTruthy();

    changeInput(slider, '1');

    expect(container.textContent).toContain('Lvl 1');
    expect(container.textContent).toContain('Build Speed: 100% (100.0% time)');
  });

  it('selects a different building when clicking a card in the grid', () => {
    const whCard = [...container.querySelectorAll('.bs-card')].find(
      (c) => c.textContent?.includes('Warehouse')
    ) as HTMLElement;
    expect(whCard).toBeTruthy();
    click(whCard);

    expect(container.querySelector('.bs-hero__title')?.textContent).toBe('Warehouse');
    expect(container.textContent).toContain('125,000 Resource Capacity');
  });

  it('correctly calculates MB speed reduction factors and time formatting', () => {
    expect(getMainBuildingFactor(1)).toBe(1.0);
    expect(getMainBuildingFactor(20)).toBe(0.493);

    expect(formatTimeSeconds(45)).toBe('45s');
    expect(formatTimeSeconds(125)).toBe('2m 5s');
    expect(formatTimeSeconds(3665)).toBe('1h 1m 5s');
    expect(formatTimeSeconds(90000)).toBe('1d 1h 0m');
    expect(formatTimeSeconds(0)).toBe('Instant');
    expect(formatTimeSeconds(null)).toBe('Instant');
  });

  it('formats building effects cleanly into human-readable strings', () => {
    expect(formatEffectLabel('storageWarehouse', 80000)).toBe('80,000 Resource Capacity');
    expect(formatEffectLabel('production1', 500)).toBe('+500 Wood/hr');
    expect(formatEffectLabel('productionBoost1', 0.25)).toBe('+25% Wood Production');
    expect(formatEffectLabel('trainingTimeBarracks', 0.135)).toBe('13.5% Training Time');
    expect(formatEffectLabel('traps', 400)).toBe('400 Traps');
  });

  it('describes prerequisites accurately', () => {
    const th = BUILDINGS_BY_GID.get(24)!;
    const prereqs = describePrerequisites(th);
    expect(prereqs.length).toBeGreaterThan(0);
    expect(prereqs.some((p) => p.includes('Main Building') || p.includes('Academy'))).toBe(true);
  });
});
