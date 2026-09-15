// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseKiloNumber, KiloNumberInput } from './KiloNumberInput';

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

describe('parseKiloNumber', () => {
  it('converts k / K to thousands', () => {
    expect(parseKiloNumber('130k')).toBe(130000);
    expect(parseKiloNumber('10k')).toBe(10000);
    expect(parseKiloNumber('10K')).toBe(10000);
    expect(parseKiloNumber('1k')).toBe(1000);
    expect(parseKiloNumber('2.5k')).toBe(2500);
    expect(parseKiloNumber('2,5k')).toBe(2500);
    expect(parseKiloNumber('0.5k')).toBe(500);
  });

  it('converts m / M to millions', () => {
    expect(parseKiloNumber('1m')).toBe(1000000);
    expect(parseKiloNumber('1.2M')).toBe(1200000);
    expect(parseKiloNumber('2.5m')).toBe(2500000);
  });

  it('handles standard and localized thousands separators', () => {
    expect(parseKiloNumber('130,000')).toBe(130000);
    expect(parseKiloNumber('130.000')).toBe(130000);
    expect(parseKiloNumber('130 000')).toBe(130000);
    expect(parseKiloNumber('1,000,000')).toBe(1000000);
  });

  it('handles regular numbers and edge cases', () => {
    expect(parseKiloNumber('500')).toBe(500);
    expect(parseKiloNumber('0')).toBe(0);
    expect(parseKiloNumber('')).toBe(0);
    expect(parseKiloNumber(130000)).toBe(130000);
    expect(parseKiloNumber(-50)).toBe(0);
  });
});

describe('KiloNumberInput component', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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

  it('expands 130k to 130000 immediately as user types', async () => {
    const onChangeMock = vi.fn();

    await act(async () => {
      root.render(<KiloNumberInput value={0} onChange={onChangeMock} ariaLabel="Troops" />);
    });

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();

    // Type 130k
    changeInput(input, '130k');

    expect(onChangeMock).toHaveBeenCalledWith(130000);
    expect(input.value).toBe('130000');
  });

  it('expands 10k to 10000 immediately as user types', async () => {
    const onChangeMock = vi.fn();

    await act(async () => {
      root.render(<KiloNumberInput value={0} onChange={onChangeMock} ariaLabel="Troops" />);
    });

    const input = container.querySelector('input') as HTMLInputElement;

    changeInput(input, '10k');

    expect(onChangeMock).toHaveBeenCalledWith(10000);
    expect(input.value).toBe('10000');
  });
});
