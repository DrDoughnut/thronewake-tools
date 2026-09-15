import { useEffect, useState, type ChangeEvent } from 'react';

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

  // Sync with incoming value if it changes externally
  useEffect(() => {
    const currentParsed = parseKiloNumber(text);
    if (currentParsed !== value) {
      setText(value === 0 ? '' : String(value));
    }
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const lower = raw.toLowerCase();

    // If the user typed 'k' or 'm' shorthand, immediately convert to numeric string
    if (lower.includes('k') || lower.includes('m')) {
      const parsed = parseKiloNumber(raw);
      const clamped = max !== undefined ? Math.min(max, Math.max(min, parsed)) : Math.max(min, parsed);
      const formatted = clamped === 0 ? '' : String(clamped);
      setText(formatted);
      onChange(clamped);
      return;
    }

    setText(raw);
    const parsed = parseKiloNumber(raw);
    const clamped = max !== undefined ? Math.min(max, Math.max(min, parsed)) : Math.max(min, parsed);
    onChange(clamped);
  };

  const handleBlur = () => {
    const parsed = parseKiloNumber(text);
    const clamped = max !== undefined ? Math.min(max, Math.max(min, parsed)) : Math.max(min, parsed);
    setText(clamped === 0 ? '' : String(clamped));
    onChange(clamped);
  };

  return (
    <input
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
    />
  );
}
