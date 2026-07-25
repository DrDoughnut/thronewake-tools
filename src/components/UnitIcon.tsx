import { lookup, type UnitRef } from '../data/factions';
import { unitIcon } from '../icons';

interface Props {
  unitRef: UnitRef;
  size?: number;
}

/**
 * A unit's artwork, or its glyph on the faction colour when no image has
 * been added yet. See `src/icons.ts` for how to supply art.
 */
export function UnitIcon({ unitRef, size = 34 }: Props) {
  const { faction, unit } = lookup(unitRef);
  const src = unitIcon(unit.key);
  const style = {
    width: size,
    height: size,
    '--faction-color': faction.color,
  } as React.CSSProperties;

  const title = [`${unit.name} — ${faction.name}`, unit.description]
    .filter(Boolean)
    .join('\n\n');

  if (src) {
    return <img className="unit-icon" style={style} src={src} alt={unit.name} title={title} />;
  }

  return (
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
}
