import { useEffect } from 'react';
import { CHANGELOG } from '../data/changelog';

interface Props {
  onClose: () => void;
}

/** A dismissable overlay listing release notes, opened from the version badge. */
export function Changelog({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="changelog-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="changelog-panel panel" role="dialog" aria-modal="true" aria-label="Changelog">
        <div className="changelog-panel__head">
          <h2 className="panel__title">Changelog</h2>
          <button type="button" className="pill pill--tiny" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {CHANGELOG.map((entry) => (
          <section className="changelog-entry" key={entry.version}>
            <h3 className="changelog-entry__head">
              <span>v{entry.version}</span>
              <span className="changelog-entry__date">{entry.date}</span>
            </h3>
            <ul className="changelog-entry__list">
              {entry.changes.map((change, i) => (
                <li key={i}>{change}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
