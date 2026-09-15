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

    it('steps by 1s for numbers starting with 1 in the 10-19 range', () => {
      expect(getSmartScrollStep(10, 'up')).toBe(1);
      expect(getSmartScrollStep(15, 'up')).toBe(1);
      expect(getSmartScrollStep(19, 'up')).toBe(1);
      // Downward transitions: 10 -> 9, 20 -> 19
      expect(getSmartScrollStep(10, 'down')).toBe(1);
      expect(getSmartScrollStep(20, 'down')).toBe(1);
    });

    it('steps by 10s for 20-99 and 100-199', () => {
      expect(getSmartScrollStep(20, 'up')).toBe(10);
      expect(getSmartScrollStep(50, 'up')).toBe(10);
      expect(getSmartScrollStep(90, 'up')).toBe(10);
      // Starts with 1 in 100s: steps by previous tier (10s): 100 -> 110 -> 120 ... -> 200
      expect(getSmartScrollStep(100, 'up')).toBe(10);
      expect(getSmartScrollStep(150, 'up')).toBe(10);
      // Downward transitions: 100 -> 90, 200 -> 190
      expect(getSmartScrollStep(100, 'down')).toBe(10);
      expect(getSmartScrollStep(200, 'down')).toBe(10);
    });

    it('steps by 100s for 200-999 and 1,000-1,999', () => {
      expect(getSmartScrollStep(200, 'up')).toBe(100);
      expect(getSmartScrollStep(500, 'up')).toBe(100);
      // Starts with 1 in 1000s: steps by previous tier (100s): 1,000 -> 1,100 ... -> 2,000
      expect(getSmartScrollStep(1000, 'up')).toBe(100);
      expect(getSmartScrollStep(1500, 'up')).toBe(100);
      // Downward transitions: 1,000 -> 900, 2,000 -> 1,900
      expect(getSmartScrollStep(1000, 'down')).toBe(100);
      expect(getSmartScrollStep(2000, 'down')).toBe(100);
    });

    it('steps by 1,000s (1k) for 2,000-9,999 and 10k-19k', () => {
      expect(getSmartScrollStep(2000, 'up')).toBe(1000);
      expect(getSmartScrollStep(5000, 'up')).toBe(1000);
      // Starts with 1 in 10k range: steps by 1k (10k -> 11k -> 12k ... -> 20k)
      expect(getSmartScrollStep(10000, 'up')).toBe(1000);
      expect(getSmartScrollStep(14000, 'up')).toBe(1000);
      // Downward transitions: 10k -> 9k, 20k -> 19k
      expect(getSmartScrollStep(10000, 'down')).toBe(1000);
      expect(getSmartScrollStep(20000, 'down')).toBe(1000);
    });

    it('steps by 10,000s (10k) for 20k-99k and 100k-199k', () => {
      expect(getSmartScrollStep(20000, 'up')).toBe(10000);
      expect(getSmartScrollStep(50000, 'up')).toBe(10000);
      expect(getSmartScrollStep(100000, 'up')).toBe(10000);
      expect(getSmartScrollStep(100000, 'down')).toBe(10000);
      expect(getSmartScrollStep(200000, 'down')).toBe(10000);
    });

    it('steps by 100,000s (100k) for 200k-999k', () => {
      // Fast scrolling through 200k+: 200k -> 300k -> 400k instead of crawling by 1k
      expect(getSmartScrollStep(200000, 'up')).toBe(100000);
      expect(getSmartScrollStep(500000, 'up')).toBe(100000);
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
      root.render(<KiloNumberInput value={200} onChange={onChangeMock} ariaLabel="Troops" />);
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

    // At 200, 3 digits starting with 2 -> step is 100 -> 300
    expect(onChangeMock).toHaveBeenCalledWith(300);
    expect(input.value).toBe('300');

    // Scroll down (deltaY > 0)
    await act(async () => {
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 50,
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(wheelEvent);
    });

    expect(onChangeMock).toHaveBeenCalledWith(200);
    expect(input.value).toBe('200');
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
