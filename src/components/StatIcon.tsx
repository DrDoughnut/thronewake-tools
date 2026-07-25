import type { StatMeta } from '../data/statMeta';
import { statIcon } from '../icons';

interface Props {
  meta: StatMeta;
  size?: number;
}

/**
 * The game's own icon for a stat, falling back to a text glyph for the two
 * reconnaissance stats, which Thronewake does not publish and so has no
 * artwork for.
 */
export function StatIcon({ meta, size = 15 }: Props) {
  const src = meta.icon ? statIcon(meta.icon) : undefined;

  if (src) {
    return (
      <img
        className="stat-icon"
        src={src}
        alt=""
        aria-hidden="true"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span className="stat-icon stat-icon--glyph" aria-hidden="true" style={{ fontSize: size }}>
      {meta.glyph ?? '•'}
    </span>
  );
}
