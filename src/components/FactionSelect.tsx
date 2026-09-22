import { useEffect, useRef, useState } from 'react';
import { playableFactions, factionChief, safeFaction } from '../data/factions';
import { unitIcon } from '../icons';

export interface FactionSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
  id?: string;
  allowAny?: boolean;
  anyLabel?: string;
}

export function FactionSelect({
  value,
  onChange,
  className = '',
  ariaLabel = 'Select race',
  id,
  allowAny = false,
  anyLabel = 'Race: Any',
}: FactionSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isAny = allowAny && !value;
  const selectedFaction = !isAny ? safeFaction(value) : null;
  const selectedChief = selectedFaction ? factionChief(selectedFaction.key) : undefined;

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleSelect = (factionKey: string) => {
    onChange(factionKey);
    setOpen(false);
  };

  return (
    <div className={`faction-select-wrap ${open ? 'is-open' : ''}`} ref={wrapRef}>
      {/* Hidden native select for form accessibility and test automation */}
      <select
        id={id ? `${id}-native` : undefined}
        className="faction-select-native"
        value={isAny ? '' : selectedFaction!.key}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowAny && <option value="">{anyLabel}</option>}
        {playableFactions.map((f) => (
          <option key={f.key} value={f.key}>
            {f.name}
          </option>
        ))}
      </select>

      {/* Visible custom trigger button showing active Chief icon + name + chevron */}
      <button
        type="button"
        id={id}
        className={`faction-select-trigger ${className}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {selectedChief && (
          <img
            src={unitIcon(selectedChief.key)}
            alt=""
            className="faction-select-icon"
            aria-hidden="true"
          />
        )}
        <span className="faction-select-name">{isAny ? anyLabel : selectedFaction!.name}</span>
        <span className="faction-select-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {/* Custom Dropdown showing Chief icon for every race */}
      {open && (
        <ul className="faction-select-dropdown" role="listbox" aria-label={ariaLabel}>
          {allowAny && (
            <li
              role="option"
              aria-selected={isAny}
              className={`faction-select-item ${isAny ? 'is-selected' : ''}`}
              onClick={() => handleSelect('')}
            >
              <span className="faction-select-item-name">{anyLabel}</span>
              {isAny && <span className="faction-select-check">✓</span>}
            </li>
          )}
          {playableFactions.map((f) => {
            const chief = factionChief(f.key);
            const isSelected = !isAny && f.key === selectedFaction!.key;
            return (
              <li
                key={f.key}
                role="option"
                aria-selected={isSelected}
                className={`faction-select-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => handleSelect(f.key)}
              >
                {chief && (
                  <img
                    src={unitIcon(chief.key)}
                    alt=""
                    className="faction-select-icon"
                    aria-hidden="true"
                  />
                )}
                <span className="faction-select-item-name">{f.name}</span>
                {isSelected && <span className="faction-select-check">✓</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
