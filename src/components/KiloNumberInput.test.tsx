// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseKiloNumber, KiloNumberInput, getSmartScrollStep } from './KiloNumberInput';

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

  describe('getSmartScrollStep', () => {
    it('steps by 1s for 1 digit numbers (0-9)', () => {
      expect(getSmartScrollStep(0, 'up')).toBe(1);
      expect(getSmartScrollStep(5, 'up')).toBe(1);
      expect(getSmartScrollStep(9, 'up')).toBe(1);
      expect(getSmartScrollStep(5, 'down')).toBe(1);
      expect(getSmartScrollStep(1, 'down')).toBe(1);
    });

    it('steps by 10s for 2 digit numbers (10-99)', () => {
      expect(getSmartScrollStep(10, 'up')).toBe(10);
      expect(getSmartScrollStep(50, 'up')).toBe(10);
      expect(getSmartScrollStep(90, 'up')).toBe(10);
      expect(getSmartScrollStep(50, 'down')).toBe(10);
      // Seamless step down across magnitude boundary: 10 -> 9
      expect(getSmartScrollStep(10, 'down')).toBe(1);
    });

    it('steps by 100s for 3 digit numbers (100-999)', () => {
      expect(getSmartScrollStep(100, 'up')).toBe(100);
      expect(getSmartScrollStep(500, 'up')).toBe(100);
      expect(getSmartScrollStep(500, 'down')).toBe(100);
      // Seamless step down across boundary: 100 -> 90
      expect(getSmartScrollStep(100, 'down')).toBe(10);
    });

    it('steps by 1000s for 4+ digit numbers (1000+)', () => {
      expect(getSmartScrollStep(1000, 'up')).toBe(1000);
      expect(getSmartScrollStep(50000, 'up')).toBe(1000);
      expect(getSmartScrollStep(50000, 'down')).toBe(1000);
      // Seamless step down across boundary: 1000 -> 900
      expect(getSmartScrollStep(1000, 'down')).toBe(100);
      expect(getSmartScrollStep(10000, 'down')).toBe(1000);
    });

    it('multiplies step by 10 when shiftKey is held', () => {
      expect(getSmartScrollStep(5, 'up', true)).toBe(10);
      expect(getSmartScrollStep(50, 'up', true)).toBe(100);
      expect(getSmartScrollStep(500, 'up', true)).toBe(1000);
      expect(getSmartScrollStep(5000, 'up', true)).toBe(10000);
    });
  });

  it('scrolls with wheel using smart steps and prevents default', async () => {
    const onChangeMock = vi.fn();

    await act(async () => {
      root.render(<KiloNumberInput value={100} onChange={onChangeMock} ariaLabel="Troops" />);
    });

    const input = container.querySelector('input') as HTMLInputElement;

    // Scroll up (deltaY < 0, threshold is 40)
    await act(async () => {
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -50,
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(wheelEvent);
    });

    // At 100, 3 digits -> step is 100 -> 200
    expect(onChangeMock).toHaveBeenCalledWith(200);
    expect(input.value).toBe('200');

    // Scroll down (deltaY > 0)
    await act(async () => {
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 50,
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(wheelEvent);
    });

    expect(onChangeMock).toHaveBeenCalledWith(100);
    expect(input.value).toBe('100');
  });

  it('adjusts value with ArrowUp and ArrowDown keys using smart steps', async () => {
    const onChangeMock = vi.fn();

    await act(async () => {
      root.render(<KiloNumberInput value={1000} onChange={onChangeMock} ariaLabel="Troops" />);
    });

    const input = container.querySelector('input') as HTMLInputElement;

    // ArrowDown at 1000: baseValue is 999 -> step is 100 -> 900
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    });

    expect(onChangeMock).toHaveBeenCalledWith(900);
    expect(input.value).toBe('900');

    // ArrowUp at 900: baseValue is 900 -> step is 100 -> 1000
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    });

    expect(onChangeMock).toHaveBeenCalledWith(1000);
    expect(input.value).toBe('1000');
  });
});
