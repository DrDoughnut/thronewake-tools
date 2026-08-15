import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { playableFactions, lookup, type UnitRef } from '../data/factions';
import { UnitIcon } from './UnitIcon';

interface UnitGridPickerProps {
  unitRef: UnitRef;
  onChange: (unitRef: UnitRef) => void;
  disabled?: boolean;
}

export function UnitGridPicker({ unitRef, onChange, disabled = false }: UnitGridPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const current = lookup(unitRef);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = Math.min(560, window.innerWidth - 24);
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }
      if (left < 12) left = 12;

      let top = rect.bottom + 6;
      // If it would overflow bottom of viewport, position above if space permits
      if (top + 420 > window.innerHeight && rect.top > 430) {
        top = rect.top - 430;
      }

      setPosition({ top: Math.max(12, top), left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectUnit = (factionKey: string, unitKey: string) => {
    const newRef = `${factionKey}/${unitKey}` as UnitRef;
    onChange(newRef);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="unit-grid-picker">
      <button
        ref={triggerRef}
        type="button"
        className={`unit-grid-picker__trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Slowest troop: ${current.unit.name}, ${current.unit.speed} fields per hour. Click to change.`}
      >
        <div className="unit-grid-picker__preview">
          <UnitIcon unitRef={unitRef} size={32} />
          <div className="unit-grid-picker__summary">
            <span className="unit-grid-picker__name">{current.unit.name}</span>
            <span className="unit-grid-picker__faction">{current.faction.name}</span>
          </div>
        </div>
        <div className="unit-grid-picker__speed-badge">
          <span className="unit-grid-picker__speed-val">{current.unit.speed}</span>
          <span className="unit-grid-picker__speed-unit">fields/h</span>
        </div>
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            className="unit-grid-popover"
            style={{ top: position.top, left: position.left }}
            role="dialog"
            aria-label="Choose slowest troop"
          >
            <div className="unit-grid-popover__header">
              <span className="unit-grid-popover__title">Select Slowest Troop</span>
              <button
                type="button"
                className="unit-grid-popover__close"
                onClick={() => setIsOpen(false)}
                aria-label="Close troop picker"
              >
                ✕
              </button>
            </div>

            <div className="unit-grid-popover__content">
              {playableFactions.map((faction) => (
                <div key={faction.key} className="unit-grid-faction">
                  <div
                    className="unit-grid-faction__title"
                    style={{ '--faction-color': faction.color } as React.CSSProperties}
                  >
                    <span className="unit-grid-faction__badge" />
                    <span>{faction.name}</span>
                  </div>
                  <div className="unit-grid-faction__units">
                    {faction.units.map((unit) => {
                      const ref = `${faction.key}/${unit.key}` as UnitRef;
                      const isSelected = unitRef === ref;
                      return (
                        <button
                          key={unit.key}
                          type="button"
                          className={`unit-grid-item ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => selectUnit(faction.key, unit.key)}
                          title={`${unit.name} (${unit.speed} fields/h)`}
                        >
                          <UnitIcon unitRef={ref} size={28} />
                          <div className="unit-grid-item__info">
                            <span className="unit-grid-item__name">{unit.name}</span>
                            <span className="unit-grid-item__speed">{unit.speed} f/h</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
