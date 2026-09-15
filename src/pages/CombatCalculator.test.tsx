// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CombatCalculator } from './CombatCalculator';

let container: HTMLDivElement;
let root: Root;

const renderComponent = async () => {
  await act(async () => {
    root.render(<CombatCalculator />);
  });
};

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

describe('CombatCalculator', () => {
  beforeEach(() => {
    window.location.hash = '';
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the compact village header and all requested icons/emojis', async () => {
    await renderComponent();

    // Village panel exists
    const villagePanel = container.querySelector('.cc-village');
    expect(villagePanel).toBeTruthy();

    // Check titles and labels
    expect(villagePanel?.textContent).toContain('Watch Tower');
    expect(villagePanel?.textContent).toContain('Stonemason');
    expect(container.querySelector('.cc-row__attack-type')?.getAttribute('aria-label')).toContain('attack type');
    expect(villagePanel?.textContent).toContain('Village Race');
    expect(villagePanel?.textContent).toContain('City Guards');
    expect(villagePanel?.textContent).toContain('Durability artifact');

    // Attacker/Defender pop are hidden when Population bonus is off by default
    expect(villagePanel?.textContent).not.toContain('Attacker pop');
    expect(villagePanel?.textContent).not.toContain('Defender pop');

    // Turn on Population bonus
    const popBonusToggle = villagePanel?.querySelector('.cc-toggle input[type="checkbox"]') as HTMLInputElement;
    expect(popBonusToggle).toBeTruthy();
    act(() => {
      popBonusToggle.click();
    });
    expect(villagePanel?.textContent).toContain('Attacker pop');
    expect(villagePanel?.textContent).toContain('Defender pop');

    // Catapult targets only appear when catapults are present (> 0)
    const offRow = container.querySelector('.cc-army--off');
    expect(offRow?.textContent).not.toContain('Catapult targets');

    const cataInput = container.querySelector('input[aria-label="Dominion Catapult, row 1"]') as HTMLInputElement;
    expect(cataInput).toBeTruthy();
    changeInput(cataInput, '25');
    expect(offRow?.textContent).toContain('Catapult targets');

    // Verify icons inside the village section
    const icons = villagePanel?.querySelectorAll('.cc-field-icon');
    expect(icons && icons.length).toBeGreaterThanOrEqual(3); // Watch Tower, Residence/Palace, Stonemason

    // Verify emojis
    const emojis = villagePanel?.querySelectorAll('.cc-field-emoji');
    expect(emojis && emojis.length).toBeGreaterThanOrEqual(2); // Village, 2x pop
  });

  it('renders the layout with Attackers on top, The Village in middle, and Defenders at bottom', async () => {
    await renderComponent();

    const layout = container.querySelector('.cc-layout');
    expect(layout).toBeTruthy();

    const colMain = layout?.querySelector('.cc-col-main');
    const colDetails = layout?.querySelector('.cc-col-details');
    expect(colMain).toBeTruthy();
    expect(colDetails).toBeTruthy();

    // Verify colMain has Battle Details on top (always open), separator, then Attackers, Village, Defenders
    const children = colMain?.children;
    expect(children?.length).toBe(5);
    expect(children?.[0].classList.contains('cc-details')).toBe(true);
    expect(children?.[1].classList.contains('cc-inputs-separator')).toBe(true);
    expect(children?.[2].classList.contains('cc-army--off')).toBe(true);
    expect(children?.[3].classList.contains('cc-village')).toBe(true);
    expect(children?.[4].classList.contains('cc-army--def')).toBe(true);

    expect(children?.[0].textContent).toContain('Battle Details');
    expect(children?.[2].textContent).toContain('Attackers');
    expect(children?.[3].textContent).toContain('The village');
    expect(children?.[4].textContent).toContain('Defenders');

    // Verify input rows do not contain Sent, Lost, Left row labels
    expect(colMain?.querySelector('.cc-row-labels')).toBeNull();
  });

  it('resolves battle and updates summary cards and report tables when attacker troops are entered', async () => {
    await renderComponent();

    // Battle Details is always open, showing 0s before troops are entered
    const details = container.querySelector('.cc-col-main .cc-details');
    expect(details).toBeTruthy();
    expect(details?.textContent).toContain('Battle Details');
    expect(details?.textContent).toContain('💀 casualties');
    expect(details?.textContent).toContain('Show survivors');

    // Enter attacker troops into the first troop count input
    const attackerTroopInput = container.querySelector('.cc-army--off .cc-troop__count') as HTMLInputElement;
    expect(attackerTroopInput).toBeTruthy();
    changeInput(attackerTroopInput, '500');

    // Report table inside details has Troops, casualties, survivors with updated numbers
    expect(details?.textContent).toContain('Troops');
    expect(details?.textContent).toContain('500');
    expect(details?.textContent).toContain('survivors');

    // Battle Summary section is rendered in the right column
    const summaryPanel = container.querySelector('.cc-col-details .cc-summary-panel');
    expect(summaryPanel).toBeTruthy();
    expect(container.querySelector('.cc-summary__card--off')).toBeTruthy();
    expect(container.querySelector('.cc-summary__card--def')).toBeTruthy();
    expect(container.querySelector('.cc-summary')).toBeTruthy();
    expect(container.querySelector('.cc-report-summary-table')).toBeTruthy();

    // Unit card in attacker only contains the count input without inline loss/left rows
    const firstTroop = container.querySelector('.cc-army--off .cc-troop');
    expect(firstTroop).toBeTruthy();
    const countInput = firstTroop?.querySelector('.cc-troop__count') as HTMLInputElement;
    expect(countInput.value).toBe('500');
    expect(firstTroop?.querySelector('.cc-troop__stat--lost')).toBeNull();
    expect(firstTroop?.querySelector('.cc-troop__stat--left')).toBeNull();
  });

  it('toggles the survivors row in Battle Details with the Show survivors checkbox', async () => {
    await renderComponent();

    const details = container.querySelector('.cc-col-main .cc-details');
    const hasSurvivorsRow = () =>
      Array.from(details?.querySelectorAll('.cc-report-table__row-hdr') ?? []).some(
        (el) => el.textContent === 'survivors'
      );

    // Off by default
    expect(hasSurvivorsRow()).toBe(false);

    const toggle = details?.querySelector('.cc-toggle input[type="checkbox"]') as HTMLInputElement;
    expect(toggle).toBeTruthy();
    expect(toggle.checked).toBe(false);

    // Toggle on
    act(() => {
      toggle.click();
    });
    expect(hasSurvivorsRow()).toBe(true);

    // Toggle back off
    act(() => {
      toggle.click();
    });
    expect(hasSurvivorsRow()).toBe(false);
  });

  it('loads configuration directly from URL hash', async () => {
    window.location.hash = '#tool=combat&wl=14&sm=8&ap=3200&dp=1100&att=embermark_dominion:18:emberblade=2500&def=verdant_wardens:20:briar_guard=5000';

    await renderComponent();

    // Verify inputs were populated from URL
    const inputs = container.querySelectorAll('.ds-field__input');
    const wallInput = Array.from(inputs).find((inp) => (inp as HTMLInputElement).value === '14') as HTMLInputElement;
    expect(wallInput).toBeTruthy();

    const stoneInput = Array.from(inputs).find((inp) => (inp as HTMLInputElement).value === '8') as HTMLInputElement;
    expect(stoneInput).toBeTruthy();

    const attPopInput = Array.from(inputs).find((inp) => (inp as HTMLInputElement).value === '3200') as HTMLInputElement;
    expect(attPopInput).toBeTruthy();

    const defPopInput = Array.from(inputs).find((inp) => (inp as HTMLInputElement).value === '1100') as HTMLInputElement;
    expect(defPopInput).toBeTruthy();

    // Battle should be resolved immediately with results rendered
    expect(container.querySelector('.cc-details')).toBeTruthy();
    expect(container.querySelector('.cc-summary__card--off')).toBeTruthy();
  });

  it('provides a Share button that copies the current URL to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    await renderComponent();

    const shareBtn = container.querySelector('.cc-share-btn') as HTMLButtonElement;
    expect(shareBtn).toBeTruthy();
    expect(shareBtn.textContent).toContain('Share');

    await act(async () => {
      shareBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(writeTextMock).toHaveBeenCalled();
    expect(writeTextMock.mock.calls[0][0]).toContain('#tool=combat');
    expect(shareBtn.textContent).toContain('Copied');
  });

  it('includes chiefs and settlers in combat rosters and reflects loyalty in results', async () => {
    // URL with a chief (high_prefect=2) and settlers (settler1=3)
    window.location.hash =
      '#tool=combat&wl=0&sm=0&ap=1000&dp=1000&att=embermark_dominion:20:emberblade=500,high_prefect=2,settler1=3&def=verdant_wardens:20:briar_guard=50';

    await renderComponent();

    // Verify chief and settler names are displayed in the attacker roster
    const offRoster = container.querySelector('.cc-army--off');
    expect(offRoster?.textContent).toContain('High Prefect');
    expect(offRoster?.textContent).toContain('Settler');

    // Event outcomes in Battle Details displays loyalty reduction
    const reportOutcomes = container.querySelector('.cc-report-outcomes');
    expect(reportOutcomes?.textContent).toContain('loyalty');
    expect(reportOutcomes?.textContent).toContain('2 chiefs');
  });

  it('toggles unit upgrade level between 0 and 20 when clicking unit icon', async () => {
    await renderComponent();

    const firstTroop = container.querySelector('.cc-army--off .cc-troop');
    expect(firstTroop).toBeTruthy();

    const levelInput = firstTroop?.querySelector('.cc-troop__level') as HTMLInputElement;
    const iconBtn = firstTroop?.querySelector('.cc-troop__icon-btn') as HTMLButtonElement;
    expect(levelInput).toBeTruthy();
    expect(iconBtn).toBeTruthy();

    // Default level is empty / 0
    expect(levelInput.value).toBe('');

    // Click icon -> toggles to 20
    await act(async () => {
      iconBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(levelInput.value).toBe('20');

    // Click icon again -> toggles back to 0
    await act(async () => {
      iconBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(levelInput.value).toBe('0');
  });

  it('applies +25% offense bonus when attack type is set to Siege', async () => {
    // Normal attack
    window.location.hash =
      '#tool=combat&t=a&wl=0&sm=0&ap=1000&dp=1000&att=embermark_dominion:0:emberblade=1000&def=verdant_wardens:0:briar_guard=1000';
    await renderComponent();
    const offCellsNormal = container.querySelectorAll('.cc-report-summary-table tbody tr:nth-child(3) td');
    const offPointsNormal = offCellsNormal[0]?.textContent;

    // Siege attack
    window.location.hash =
      '#tool=combat&t=s&wl=0&sm=0&ap=1000&dp=1000&att=embermark_dominion:0:emberblade=1000&def=verdant_wardens:0:briar_guard=1000';
    await renderComponent();
    const offCellsSiege = container.querySelectorAll('.cc-report-summary-table tbody tr:nth-child(3) td');
    const offPointsSiege = offCellsSiege[0]?.textContent;

    // 1000 emberblade @ 40 off = 40k. In siege (+25%), 40k * 1.25 = 50k.
    expect(offPointsNormal).toContain('40k');
    expect(offPointsSiege).toContain('50k');
  });

  it('supports Stormfang Brewery bonus and per-troop smithy inputs', async () => {
    // Stormfang clans attacker with 1000 raider @ 40 base off = 40,000 off at smithy 0
    // With brewery level 10 (+10%), offense is 40,000 * 1.10 = 44,000 = 44k
    window.location.hash =
      '#tool=combat&wl=0&sm=0&ap=1000&dp=1000&att=stormfang_clans:0:raider=1000:10:&def=verdant_wardens:0:briar_guard=1000';
    await renderComponent();

    // Verify Brewery input is rendered for Stormfang attacker
    const breweryInput = container.querySelector('.cc-row__brewery-num input') as HTMLInputElement;
    expect(breweryInput).toBeTruthy();
    expect(breweryInput.value).toBe('10');

    // Check that per-troop level inputs exist
    const troopLevels = container.querySelectorAll('.cc-troop__level');
    expect(troopLevels.length).toBeGreaterThan(0);

    // Verify offense points reflect the +10% brewery boost
    const offCells = container.querySelectorAll('.cc-report-summary-table tbody tr:nth-child(3) td');
    expect(offCells[0]?.textContent).toContain('44k');
  });

  it('allows troop levels up to 23 and caps catapult target levels per building', async () => {
    await renderComponent();

    const firstTroop = container.querySelector('.cc-army--off .cc-troop');
    const levelInput = firstTroop?.querySelector('.cc-troop__level') as HTMLInputElement;
    expect(levelInput).toBeTruthy();
    expect(levelInput.max).toBe('23');

    // Enter level 23
    changeInput(levelInput, '23');
    expect(levelInput.value).toBe('23');

    // Add catapults to show target row
    const cataInput = container.querySelector('input[aria-label="Dominion Catapult, row 1"]') as HTMLInputElement;
    changeInput(cataInput, '50');

    // Default target is Warehouse (gid 10, maxLevel 22)
    const targetLvlInput = container.querySelector('.cc-target-card-compact input[type="number"]') as HTMLInputElement;
    expect(targetLvlInput).toBeTruthy();
    expect(targetLvlInput.max).toBe('22');

    // Change target to Residence (gid 25, maxLevel 20)
    const targetSelect = container.querySelector('.cc-target-card-compact select') as HTMLSelectElement;
    expect(targetSelect).toBeTruthy();
    changeInput(targetSelect, '25');

    // After switching to Residence, max level is 20
    expect(targetLvlInput.max).toBe('20');
  });

  it('renders all defenders in Battle Details from the start and when defenders are added', async () => {
    await renderComponent();

    // Initially 1 defender -> 1 defense table in Battle Details
    let defTables = container.querySelectorAll('.cc-report-table--def');
    expect(defTables.length).toBe(1);

    // Click "+ Add defender" button
    const addDefBtn = container.querySelector('.cc-army--def .cc-army__head button') as HTMLButtonElement;
    expect(addDefBtn).toBeTruthy();
    await act(async () => {
      addDefBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Now 2 defenders exist in Battle Details
    defTables = container.querySelectorAll('.cc-report-table--def');
    expect(defTables.length).toBe(2);

    // Verify side labels distinguish Defender #1 and Defender #2
    const sideLabels = Array.from(container.querySelectorAll('.cc-report-table--def .cc-report-table__side-label')).map(
      (el) => el.textContent
    );
    expect(sideLabels).toContain('Defense · #1');
    expect(sideLabels).toContain('Defense · #2');
  });

  it('switches between Overall and per-wave views in Battle Details', async () => {
    // 2 waves of attackers
    window.location.hash =
      '#tool=combat&wl=0&sm=0&ap=1000&dp=1000&att=embermark_dominion:0:emberblade=1000&att=stormfang_clans:0:raider=800&def=verdant_wardens:0:briar_guard=1200';

    await renderComponent();

    // In Overall view by default: both Wave 1 and Wave 2 Offense tables are shown
    const viewPills = container.querySelectorAll('.cc-view-pills button');
    expect(viewPills.length).toBe(3); // Overall, Wave 1, Wave 2
    expect(viewPills[0]?.textContent).toBe('Overall');
    expect(viewPills[0]?.classList.contains('pill--active')).toBe(true);

    let offTables = container.querySelectorAll('.cc-report-table--off');
    expect(offTables.length).toBe(2);

    // Click "Wave 1" pill
    await act(async () => {
      viewPills[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    offTables = container.querySelectorAll('.cc-report-table--off');
    expect(offTables.length).toBe(1);
    expect(container.querySelector('.cc-report-table--off .cc-report-table__side-label')?.textContent).toBe('Offense · W1');

    // Click "Wave 2" pill
    await act(async () => {
      viewPills[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    offTables = container.querySelectorAll('.cc-report-table--off');
    expect(offTables.length).toBe(1);
    expect(container.querySelector('.cc-report-table--off .cc-report-table__side-label')?.textContent).toBe('Offense · W2');

    // Click "Overall" pill to return to overall view
    await act(async () => {
      viewPills[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    offTables = container.querySelectorAll('.cc-report-table--off');
    expect(offTables.length).toBe(2);
  });

  it('converts 130k to 130000 and 10k to 10000 in troop count and pop inputs', async () => {
    await renderComponent();

    // Troop count input
    const firstTroop = container.querySelector('.cc-army--off .cc-troop');
    const troopInput = firstTroop?.querySelector('.cc-troop__count') as HTMLInputElement;
    expect(troopInput).toBeTruthy();

    // Type 130k into troop count
    changeInput(troopInput, '130k');
    expect(troopInput.value).toBe('130000');

    // Check that Battle Details reflected 130,000 troops
    const details = container.querySelector('.cc-details');
    expect(details?.textContent).toContain('130,000');

    // Type 10k into troop count
    changeInput(troopInput, '10k');
    expect(troopInput.value).toBe('10000');
    expect(details?.textContent).toContain('10,000');

    // Enable Population bonus and test Attacker pop
    const popBonusToggle = container.querySelector('.cc-toggle input[type="checkbox"]') as HTMLInputElement;
    act(() => {
      popBonusToggle.click();
    });

    const attPopInput = container.querySelector('input[aria-label="Attacker pop"]') as HTMLInputElement;
    expect(attPopInput).toBeTruthy();
    changeInput(attPopInput, '25k');
    expect(attPopInput.value).toBe('25000');
  });

  it('places share button in Battle Details, places race selector beside The Village, removes attacker caption, and confirms wave removal', async () => {
    // 2 waves of attackers
    window.location.hash =
      '#tool=combat&wl=0&sm=0&att=embermark_dominion:0:emberblade=1000&att=stormfang_clans:0:raider=800&def=verdant_wardens:0:briar_guard=1200';

    await renderComponent();

    // 1. Share button is in Battle Details header, not in Village card
    const detailsShareBtn = container.querySelector('.cc-details .cc-share-btn');
    expect(detailsShareBtn).toBeTruthy();
    const villageShareBtn = container.querySelector('.cc-village .cc-share-btn');
    expect(villageShareBtn).toBeNull();

    // 2. Village Race selector is in cc-village__title-group right next to The Village
    const villageTitleGroup = container.querySelector('.cc-village__title-group');
    expect(villageTitleGroup).toBeTruthy();
    expect(villageTitleGroup?.textContent).toContain('The village');
    expect(villageTitleGroup?.querySelector('.cc-village__race-select')).toBeTruthy();
    // No emoji or text for "Village Race" inside the grid
    expect(container.querySelector('.cc-village__grid .cc-field--race')).toBeNull();

    // 3. Attackers card has no caption text
    const offCard = container.querySelector('.cc-army--off');
    expect(offCard?.textContent).not.toContain('Each row lands as its own wave');

    // 4. Village card displays clean, organized stats summary
    const villageStats = container.querySelectorAll('.cc-village-stat');
    expect(villageStats.length).toBe(4);
    expect(container.querySelector('.cc-village__footer')?.textContent).toContain('Defense Bonus');
    expect(container.querySelector('.cc-village__footer')?.textContent).toContain('Wall vs Rams');
    expect(container.querySelector('.cc-village__footer')?.textContent).toContain('Buildings vs Catapults');

    // 5. Wave removal confirms with user before deleting
    let confirmCalled = false;
    let confirmMessage = '';
    const originalConfirm = window.confirm;
    window.confirm = (msg?: string) => {
      confirmCalled = true;
      confirmMessage = msg || '';
      return false; // User cancelled
    };

    const removeBtn = container.querySelector('.cc-army--off .cc-row__remove') as HTMLButtonElement;
    expect(removeBtn).toBeTruthy();
    await act(async () => {
      removeBtn.click();
    });

    expect(confirmCalled).toBe(true);
    expect(confirmMessage).toContain('Wave 1');
    // Still 2 waves because user cancelled
    expect(container.querySelectorAll('.cc-army--off .cc-row').length).toBe(2);

    // User accepts confirmation
    window.confirm = () => true;
    await act(async () => {
      removeBtn.click();
    });
    // Now 1 wave remains
    expect(container.querySelectorAll('.cc-army--off .cc-row').length).toBe(1);

    window.confirm = originalConfirm;
  });

  it('removes subbar & crown, shows loss % on banners, enlarges outcome icons, removes XP row, and calculates wall durability with stonemason', async () => {
    // Battle report setup with rams and cats
    window.location.hash =
      '#tool=combat&wl=10&sm=10&att=embermark_dominion:0:emberblade=1000,iron_ram=50,dominion_catapult=25&def=verdant_wardens:0:briar_guard=500';

    await renderComponent();

    // 1. Crown emoji and visible sub-bar are removed from battle details
    expect(container.querySelector('.cc-report-subbar')).toBeNull();
    expect(container.querySelector('.cc-report-subbar__crown')).toBeNull();

    // 2. Banner headers show loss percentage with banner__loss
    const offLoss = container.querySelector('.cc-report-banner--off .cc-report-banner__loss');
    expect(offLoss).toBeTruthy();
    expect(offLoss?.textContent).toContain('Loss:');

    const defLoss = container.querySelector('.cc-report-banner--def .cc-report-banner__loss');
    expect(defLoss).toBeTruthy();
    expect(defLoss?.textContent).toContain('Loss:');

    // 3. Details outcome icons use cc-report-outcome-icon (28px)
    const outcomeIcons = container.querySelectorAll('.cc-report-outcome-icon');
    expect(outcomeIcons.length).toBeGreaterThan(0);

    // 4. XP row is removed from summary table
    expect(container.querySelector('.cc-summary-xp-row')).toBeNull();

    // 5. Morale bonus checkbox is named "Morale bonus"
    const villagePanel = container.querySelector('.cc-village');
    expect(villagePanel?.textContent).toContain('Morale bonus');

    // 6. Wall vs Rams reflects stonemason (lvl 10 = 2.0x, Verdant Wardens wall durability 2.0x => 4.0x)
    const wallRamsStat = Array.from(container.querySelectorAll('.cc-village-stat')).find(
      (el) => el.querySelector('.cc-village-stat__label')?.textContent === 'Wall vs Rams',
    );
    expect(wallRamsStat).toBeTruthy();
    expect(wallRamsStat?.querySelector('.cc-village-stat__value')?.textContent).toBe('4.0×');
    expect(wallRamsStat?.querySelector('.cc-village-stat__sub')?.textContent).toContain('+100% stone');
  });

  it('displays all 10 unit columns including scouts in input rows and reports', async () => {
    await renderComponent();

    // In input row, there should be 10 troop input groups per faction
    const offTroops = container.querySelectorAll('.cc-army--off .cc-troop');
    expect(offTroops.length).toBe(10);

    // In battle details report, there should be 10 unit columns
    const reportCols = container.querySelectorAll('.cc-report-table--off .cc-report-unit-col');
    expect(reportCols.length).toBe(10);
  });

  it('supports reordering attacker waves with move up and move down buttons', async () => {
    // Start with 2 attacker waves: wave 1 Embermark with 1000 emberblade, wave 2 Stormfang with 500 raider
    window.location.hash =
      '#tool=combat&wl=0&sm=0&att=embermark_dominion:0:emberblade=1000~stormfang_clans:0:raider=500&def=verdant_wardens:0:briar_guard=1000';
    await renderComponent();

    const offRows = () => container.querySelectorAll('.cc-army--off .cc-row');
    expect(offRows().length).toBe(2);

    // Check initial factions
    const firstFactionSelect = offRows()[0].querySelector('select') as HTMLSelectElement;
    expect(firstFactionSelect.value).toBe('embermark_dominion');

    // Click "Move Wave 1 later" button
    const moveDownBtn = offRows()[0].querySelector('button[aria-label="Move Wave 1 later"]') as HTMLButtonElement;
    expect(moveDownBtn).toBeTruthy();
    expect(moveDownBtn.disabled).toBe(false);
    act(() => {
      moveDownBtn.click();
    });

    // Now Wave 1 should be Stormfang Clans and Wave 2 should be Embermark Dominion
    const updatedRows = offRows();
    const newFirstSelect = updatedRows[0].querySelector('select') as HTMLSelectElement;
    expect(newFirstSelect.value).toBe('stormfang_clans');
    const newSecondSelect = updatedRows[1].querySelector('select') as HTMLSelectElement;
    expect(newSecondSelect.value).toBe('embermark_dominion');
  });

  it('displays blended defense points and the formula breakdown tooltip in the summary table', async () => {
    window.location.hash =
      '#tool=combat&wl=0&sm=0&att=embermark_dominion:0:emberblade=1000&def=verdant_wardens:0:briar_guard=1000';
    await renderComponent();

    // Summary table total defense cell
    const defCells = container.querySelectorAll('.cc-report-summary-table tbody tr:nth-child(3) td');
    const defTotalCell = defCells[1];
    expect(defTotalCell).toBeTruthy();

    const tooltip = defTotalCell.getAttribute('title');
    expect(tooltip).toBeTruthy();
    expect(tooltip).toContain('Blended Defense Formula:');
    expect(tooltip).toContain('Attacker composition:');
    expect(tooltip).toContain('blended troop defense');
    expect(tooltip).toContain('Total Blended Defense');
  });

  it('shows truncated resource loss next to percentage in wave/defender banners', async () => {
    window.location.hash =
      '#tool=combat&wl=0&sm=0&att=embermark_dominion:0:emberblade=1000&def=verdant_wardens:0:briar_guard=1000';
    await renderComponent();

    const offLoss = container.querySelector('.cc-report-banner--off .cc-report-banner__loss');
    expect(offLoss?.textContent).toMatch(/Loss:\s*\d+(\.\d+)?%\s*·\s*\d+(\.\d+)?[kM]?\s*res/);

    const defLoss = container.querySelector('.cc-report-banner--def .cc-report-banner__loss');
    expect(defLoss?.textContent).toMatch(/Loss:\s*\d+(\.\d+)?%\s*·\s*\d+(\.\d+)?[kM]?\s*res/);
  });

  it('includes wall destruction under building damage total', async () => {
    // Attack with 500 rams against level 20 wall with 0 defenders -> wall is destroyed from 20 to 0
    window.location.hash =
      '#tool=combat&wl=20&sm=0&att=embermark_dominion:0:iron_ram=500&def=verdant_wardens:0:';
    await renderComponent();

    // Verify building damage card has non-zero cost reflecting destroyed Watch Tower
    const damageCard = Array.from(container.querySelectorAll('.cc-summary__card')).find(
      (card) => card.querySelector('.cc-summary__label')?.textContent === 'Building damage',
    );
    expect(damageCard).toBeTruthy();
    const damageValue = damageCard?.querySelector('.cc-summary__value')?.textContent;
    expect(damageValue).not.toBe('0');
    expect(damageCard?.querySelector('.cc-summary__sub')?.textContent).toContain('rebuild cost');
  });

  it('renders simplified summary table, comparative loss bar, and queue time lost card', async () => {
    window.location.hash =
      '#tool=combat&wl=0&sm=0&att=embermark_dominion:0:emberblade=1000&def=verdant_wardens:0:briar_guard=500';
    await renderComponent();

    // Verify consolidated resource loss rows
    const summaryTable = container.querySelector('.cc-report-summary-table');
    expect(summaryTable?.textContent).toContain('resources lost');
    expect(summaryTable?.textContent).toContain('troops');
    expect(summaryTable?.textContent).toContain('total loss');

    // Verify comparative loss bar
    const lossBar = container.querySelector('.cc-loss-comparison-bar');
    expect(lossBar).toBeTruthy();
    expect(container.querySelector('.cc-loss-comparison-header--off')?.textContent).toContain('Offense');
    expect(container.querySelector('.cc-loss-comparison-header--def')?.textContent).toContain('Defense');

    // Verify recruitment queue time lost card
    const queueCard = container.querySelector('.cc-queue-time-card');
    expect(queueCard).toBeTruthy();
    expect(queueCard?.textContent).toContain('Recruitment Queue Lost');
    expect(queueCard?.textContent).toContain('Offense Queue');
    expect(queueCard?.textContent).toContain('Defense Queue');
  });

  it('renders Trapper field when village is Verdant Wardens and simulates trapped troops with 3x scale', async () => {
    // Verdant Wardens village with Trapper level 20 (1,200 traps on 3x server)
    window.location.hash =
      '#tool=combat&vf=verdant_wardens&tr=20&wl=0&sm=0&att=embermark_dominion:0:emberblade=2000&def=verdant_wardens:0:';
    await renderComponent();

    // Verify Trapper field is present in Village card
    const trapperInput = container.querySelector('input[aria-label="Trapper"]') ||
      Array.from(container.querySelectorAll('.ds-field')).find((f) => f.textContent?.includes('Trapper'));
    expect(trapperInput).toBeTruthy();

    // Verify Trapper outcome is recorded in Battle Details with 1,200 trapped troops
    const outcomes = container.querySelector('.cc-report-outcomes__list');
    expect(outcomes?.textContent).toContain('1,200 troops were trapped');
  });

  it('does not lower village loyalty when attacking chiefs die in battle', async () => {
    // 1 High Prefect alone vs 500 Briar Guards (chief will die)
    window.location.hash =
      '#tool=combat&wl=0&sm=0&att=embermark_dominion:0:high_prefect=1&def=verdant_wardens:20:briar_guard=500';
    await renderComponent();

    const reportOutcomes = container.querySelector('.cc-report-outcomes');
    expect(reportOutcomes?.textContent).not.toContain('loyalty of the village was lowered');
    expect(reportOutcomes?.textContent).toContain('No siege damage, loyalty reduction');
  });
});


