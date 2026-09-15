import { useEffect, useRef, useState, type ChangeEvent } from 'react';

/**
 * Parses user input into a number, supporting:
 * - 'k' / 'K' thousands shorthand: "130k" -> 130,000; "10k" -> 10,000; "2.5k" -> 2,500; "2,5k" -> 2,500
 * - 'm' / 'M' millions shorthand: "1m" -> 1,000,000; "1.5M" -> 1,500,000
 * - Localized thousands separators: "130,000" or "130.000" or "130 000" -> 130,000
 */
export function parseKiloNumber(raw: string | number): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
  }
  if (!raw) return 0;
  const trimmed = String(raw).trim();
  if (!trimmed) return 0;

  const lower = trimmed.toLowerCase();
  const hasK = lower.includes('k');
  const hasM = lower.includes('m');

  if (hasK || hasM) {
    // Keep digits, commas, and dots
    const cleaned = lower.replace(/[^0-9.,]/g, '');
    let numStr = cleaned;
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // e.g. "1,250.5k" -> remove comma
      numStr = cleaned.replace(/,/g, '');
    } else if (cleaned.includes(',')) {
      // e.g. "2,5k" -> comma is decimal point
      numStr = cleaned.replace(',', '.');
    }
    const val = parseFloat(numStr);
    if (!Number.isFinite(val)) return 0;
    const mult = hasM ? 1_000_000 : 1_000;
    return Math.max(0, Math.round(val * mult));
  }

  // Handle standard number with commas or spaces as thousands separators (e.g. "130,000" or "130 000")
  if (trimmed.includes(',') && !trimmed.includes('.')) {
    const noCommas = trimmed.replace(/,/g, '');
    const val = Number(noCommas);
    if (Number.isFinite(val)) return Math.max(0, Math.round(val));
  }

  // Handle German/Spanish style thousands dots (e.g. "130.000" or "1.000.000")
  if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
    const noDots = trimmed.replace(/\./g, '');
    const val = Number(noDots);
    if (Number.isFinite(val)) return Math.max(0, Math.round(val));
  }

  // Remove whitespace
  const noSpace = trimmed.replace(/\s/g, '');
  const num = Number(noSpace);
  if (Number.isFinite(num)) {
    return Math.max(0, Math.round(num));
  }

  // Fallback: extract digits
  const fallback = parseInt(trimmed.replace(/\D/g, ''), 10);
  return Number.isFinite(fallback) ? Math.max(0, fallback) : 0;
}

/**
 * Determines the smart scrolling step size based on current value magnitude and leading digit:
 * - Single-digit numbers (0-9): step by 1s (0 -> 1 -> 2 ... -> 9)
 * - Numbers starting with 1 use the previous tier's step size:
 *   - 10-19: step by 1s (10 -> 11 -> 12 ... -> 20)
 *   - 100-199: step by 10s (100 -> 110 -> 120 ... -> 200)
 *   - 1,000-1,999: step by 100s (1,000 -> 1,100 ... -> 2,000)
 *   - 10,000-19,999: step by 1,000s (10k -> 11k -> 12k ... -> 20k)
 *   - 100,000-199,999: step by 10,000s (100k -> 110k ... -> 200k)
 * - Numbers starting with 2-9 use the full magnitude step:
 *   - 20-99: step by 10s (20 -> 30 ... -> 100)
 *   - 200-999: step by 100s (200 -> 300 ... -> 1,000)
 *   - 2,000-9,999: step by 1,000s (2,000 -> 3,000 ... -> 10,000)
 *   - 20,000-99,999: step by 10,000s (20k -> 30k ... -> 100k)
 *   - 200,000-999,999: step by 100,000s (200k -> 300k ... -> 1M)
 *
 * When scrolling down, base magnitude is measured from (value - 1) so transitioning
 * down from exact boundaries (e.g. 200k -> 190k, 100k -> 90k, 20k -> 19k, 10k -> 9k, 2k -> 1.9k, 1k -> 900)
 * smoothly steps down without jumping straight to zero.
 * Holding Shift multiplies the step by 10.
 */
export function getSmartScrollStep(
  value: number,
  direction: 'up' | 'down',
  shiftKey = false,
): number {
  const baseValue = direction === 'down' ? Math.max(0, value - 1) : Math.max(0, value);
  let step = 1;
  if (baseValue < 10) {
    step = 1;
  } else {
    const numDigits = Math.floor(baseValue).toString().length;
    const power = Math.pow(10, numDigits - 1);
    const leadingDigit = Math.floor(baseValue / power);
    step = leadingDigit === 1 ? power / 10 : power;
  }

  if (shiftKey) {
    step *= 10;
  }
  return step;
}

export interface KiloNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  min?: number;
  max?: number;
  id?: string;
  title?: string;
}

export function KiloNumberInput({
  value,
  onChange,
  className = '',
  placeholder = '0',
  ariaLabel,
  min = 0,
  max,
  id,
  title,
}: KiloNumberInputProps) {
  const [text, setText] = useState<string>(value === 0 ? '' : String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync with incoming value if it changes externally
  useEffect(() => {
    const currentParsed = parseKiloNumber(text);
    if (currentParsed !== value) {
      const formatted = value === 0 ? '' : String(value);
      setText(formatted);
      textRef.current = formatted;
    }
  }, [value]);

  // Attach non-passive wheel listener to allow e.preventDefault() and smooth smart-scrolling
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    let accumulatedDelta = 0;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        accumulatedDelta = 0;
      }, 200);

      accumulatedDelta += e.deltaY;
      const threshold = 40;

      if (Math.abs(accumulatedDelta) >= threshold) {
        const dir: 'up' | 'down' = accumulatedDelta < 0 ? 'up' : 'down';
        accumulatedDelta = 0;

        const currentNum = parseKiloNumber(textRef.current);
        const step = getSmartScrollStep(currentNum, dir, e.shiftKey);
        const next = dir === 'up' ? currentNum + step : currentNum - step;
        const clamped = max !== undefined ? Math.min(max, Math.max(min, next)) : Math.max(min, next);
        const formatted = clamped === 0 ? '' : String(clamped);
        setText(formatted);
        textRef.current = formatted;
        onChangeRef.current(clamped);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [min, max]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const lower = raw.toLowerCase();

    // If the user typed 'k' or 'm' shorthand, immediately convert to numeric string
    if (lower.includes('k') || lower.includes('m')) {
      const parsed = parseKiloNumber(raw);
      const clamped = max !== undefined ? Math.min(max, Math.max(min, parsed)) : Math.max(min, parsed);
      const formatted = clamped === 0 ? '' : String(clamped);
      setText(formatted);
      textRef.current = formatted;
      onChange(clamped);
      return;
    }

    setText(raw);
    textRef.current = raw;
    const parsed = parseKiloNumber(raw);
    const clamped = max !== undefined ? Math.min(max, Math.max(min, parsed)) : Math.max(min, parsed);
    onChange(clamped);
  };

  const handleBlur = () => {
    const parsed = parseKiloNumber(text);
    const clamped = max !== undefined ? Math.min(max, Math.max(min, parsed)) : Math.max(min, parsed);
    const formatted = clamped === 0 ? '' : String(clamped);
    setText(formatted);
    textRef.current = formatted;
    onChange(clamped);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const dir: 'up' | 'down' = e.key === 'ArrowUp' ? 'up' : 'down';
      const currentNum = parseKiloNumber(text);
      const step = getSmartScrollStep(currentNum, dir, e.shiftKey);
      const next = dir === 'up' ? currentNum + step : currentNum - step;
      const clamped = max !== undefined ? Math.min(max, Math.max(min, next)) : Math.max(min, next);
      const formatted = clamped === 0 ? '' : String(clamped);
      setText(formatted);
      textRef.current = formatted;
      onChange(clamped);
    }
  };

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      className={className}
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      title={title}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}
