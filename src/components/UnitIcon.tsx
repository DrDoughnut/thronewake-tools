import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lookup, type UnitRef } from '../data/factions';
import type { Faction, Unit } from '../data/types';
import { unitIcon } from '../icons';
import type { Modifiers } from '../engine/stats';
import { UnitStatCard } from './UnitStatCard';

interface Props {
  unitRef: UnitRef;
  size?: number;
  /**
   * When given, hovering, focusing or tapping the icon shows a stat card
   * (attack, defense, speed, capacity, upkeep) computed under these
   * modifiers, in place of the plain name tooltip.
   */
  mods?: Modifiers;
}

const CARD_WIDTH = 210;
/** Actual height varies with content; this is a safe upper estimate so the
 *  card doesn't need a layout pass before it can be placed on-screen. */
const CARD_HEIGHT_ESTIMATE = 220;
const GAP = 8;

function placeCard(anchor: DOMRect) {
  let left = anchor.left;
  if (left + CARD_WIDTH > window.innerWidth - GAP) left = window.innerWidth - CARD_WIDTH - GAP;
  if (left < GAP) left = GAP;

  let top = anchor.bottom + GAP;
  if (top + CARD_HEIGHT_ESTIMATE > window.innerHeight - GAP) {
    top = anchor.top - CARD_HEIGHT_ESTIMATE - GAP;
  }
  if (top < GAP) top = GAP;

  return { left, top };
}

/**
 * A unit's artwork, or its glyph on the faction colour when no image has
 * been added yet. See `src/icons.ts` for how to supply art.
 */
export function UnitIcon({ unitRef, size = 34, mods }: Props) {
  const { faction, unit } = lookup(unitRef);
  const src = unitIcon(unit.key);
  const style = {
    width: size,
    height: size,
    '--faction-color': faction.color,
  } as React.CSSProperties;

  // The stat card replaces the plain-text tooltip, so it isn't needed twice.
  const title = mods
    ? undefined
    : [`${unit.name} — ${faction.name}`, unit.description].filter(Boolean).join('\n\n');

  const art = src ? (
    <img className="unit-icon" style={style} src={src} alt={unit.name} title={title} />
  ) : (
    <span
      className="unit-icon unit-icon--glyph"
      style={{ ...style, fontSize: size * 0.55 }}
      title={title}
      role="img"
      aria-label={unit.name}
    >
      {unit.glyph}
    </span>
  );

  if (!mods) return art;
  return (
    <StatCardTrigger faction={faction} unit={unit} mods={mods}>
      {art}
    </StatCardTrigger>
  );
}

interface TriggerProps {
  faction: Faction;
  unit: Unit;
  mods: Modifiers;
  children: React.ReactNode;
}

/**
 * Hover-to-show on a mouse, tap-to-pin on touch or a mouse click, either way
 * dismissed by moving away, tapping elsewhere, or Escape. Rendered through a
 * portal so it is never clipped by a scrolling/`overflow:hidden` ancestor
 * such as the results table.
 */
function StatCardTrigger({ faction, unit, mods, children }: TriggerProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const open = hovered || pinned;

  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const reposition = () => {
      if (wrapRef.current) setPos(placeCard(wrapRef.current.getBoundingClientRect()));
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!pinned) return;
    const onOutside = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPinned(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinned(false);
        setHovered(false);
      }
    };
    document.addEventListener('pointerdown', onOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, [pinned]);

  return (
    <span
      ref={wrapRef}
      className="unit-icon-trigger"
      role="button"
      tabIndex={0}
      aria-haspopup="true"
      aria-expanded={open}
      aria-label={`${unit.name} stats`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        setPinned((p) => !p);
      }}
    >
      {children}
      {open &&
        pos &&
        createPortal(
          <div className="stat-card-popover" style={{ left: pos.left, top: pos.top }}>
            <UnitStatCard faction={faction} unit={unit} mods={mods} />
          </div>,
          document.body,
        )}
    </span>
  );
}
