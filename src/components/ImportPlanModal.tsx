import { useState, useEffect, useMemo, useRef } from 'react';
import type { CompactTarget, PlannerState, TeamRoomData } from '../engine/operations';
import {
  parseRoomBackup,
  parseThronewakeProfileClipboard,
  type ImportMode,
} from '../engine/operations';
import profileCopyGuide from '../assets/profile-copy-guide.png';

/**
 * What can be brought into a room:
 * - `profile`: a player profile copied in game, added to the Enemies directory
 * - `backup`: a full room backup, restored over (or merged into) this room
 */
export type ImportKind = 'profile' | 'backup';

interface ImportPlanModalProps {
  /** Which import flow to show; `null` keeps the modal closed. */
  kind: ImportKind | null;
  onClose: () => void;
  onImport: (plan: PlannerState, mode: ImportMode, customWaveName?: string) => void;
  onImportRoom?: (data: TeamRoomData, mode: 'replace' | 'merge') => void;
  /** Villages already in the directory, to preview what a profile would add. */
  knownTargets?: CompactTarget[];
}

type Detected =
  | { type: 'backup'; roomData: TeamRoomData }
  | { type: 'profile'; plan: PlannerState }
  | { type: 'none'; error: string };

const COPY: Record<
  ImportKind,
  { title: string; subtitle: string; label: string; placeholder: string; submit: string; rows: number }
> = {
  profile: {
    title: '📋 Paste Player Profile',
    subtitle:
      "Copy a player's profile in Thronewake and paste it here. Their villages are added to the Enemies directory; ones already listed are updated, not duplicated.",
    label: 'Profile text',
    placeholder: 'Paste the copied profile, e.g. Gugl / Byzantion (-8|-33)...',
    submit: 'Add to Directory',
    rows: 6,
  },
  backup: {
    title: '📥 Restore Room Backup',
    subtitle: 'Load a backup made with Export Backup: upload the .json file or paste its contents.',
    label: 'Backup file contents',
    placeholder: 'Upload a backup .json file, or paste its contents here...',
    submit: 'Restore Backup',
    rows: 3,
  },
};

/** Where to go instead when the pasted text belongs to a different flow. */
const WRONG_PLACE: Record<ImportKind, Record<Exclude<Detected['type'], 'none'>, string>> = {
  profile: {
    profile: '',
    backup: 'This is a room backup, not a player profile. Use Room options → Restore Backup.',
  },
  backup: {
    backup: '',
    profile: 'This is a player profile, not a room backup. Use “Paste Profile” in the Directory section.',
  },
};

const NOT_RECOGNIZED: Record<ImportKind, string> = {
  profile: "Couldn't find any villages with coordinates in that text.",
  backup: "That isn't a room backup file.",
};

function detect(text: string): Detected {
  const roomData = parseRoomBackup(text);
  if (roomData) return { type: 'backup', roomData };

  const profilePlan = parseThronewakeProfileClipboard(text);
  if (profilePlan && profilePlan.targets.length > 0) return { type: 'profile', plan: profilePlan };

  return { type: 'none', error: '' };
}

export function ImportPlanModal({ kind, onClose, onImport, onImportRoom, knownTargets }: ImportPlanModalProps) {
  const [inputText, setInputText] = useState('');
  const [roomImportMode, setRoomImportMode] = useState<'replace' | 'merge'>('merge');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start from a clean form each time a flow is opened
  useEffect(() => {
    if (kind) {
      setInputText('');
      setRoomImportMode('merge');
    }
  }, [kind]);

  // Close on Escape
  useEffect(() => {
    if (!kind) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [kind, onClose]);

  // Live decoding & validation
  const result = useMemo<{ detected: Exclude<Detected, { type: 'none' }> | null; error?: string }>(() => {
    const trimmed = inputText.trim();
    if (!trimmed || !kind) return { detected: null };
    try {
      const detected = detect(trimmed);
      if (detected.type === 'none') {
        return { detected: null, error: detected.error || NOT_RECOGNIZED[kind] };
      }
      if (detected.type !== kind) {
        return { detected: null, error: WRONG_PLACE[kind][detected.type] };
      }
      return { detected };
    } catch (err: unknown) {
      return { detected: null, error: err instanceof Error ? err.message : NOT_RECOGNIZED[kind] };
    }
  }, [inputText, kind]);

  if (!kind) return null;

  const copy = COPY[kind];
  const detected = result.detected;

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInputText(text.trim());
    } catch {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text === 'string') setInputText(text.trim());
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detected) return;

    if (detected.type === 'backup') {
      onImportRoom?.(detected.roomData, roomImportMode);
    } else if (detected.type === 'profile') {
      onImport(detected.plan, 'merge_only');
    }
    onClose();
  };

  const renderPreview = () => {
    if (!detected) {
      return <div className="op-import-preview__error">⚠️ {result.error}</div>;
    }

    if (detected.type === 'backup') {
      const { roomData } = detected;
      return (
        <>
          <div className="op-import-preview__head">
            <span className="op-import-preview__badge is-success">✓ Room backup</span>
            <span className="op-import-preview__meta">
              Room: <strong>{roomData.roomName || 'Team Room'}</strong>
            </span>
          </div>
          <div className="op-import-preview__sub">
            {roomData.roster.attackers.length} hammers · {roomData.roster.targets.length} villages (
            {roomData.roster.players.length} players) · {roomData.operations.length} operations
          </div>
        </>
      );
    }

    const { plan } = detected;
    const known = new Set((knownTargets ?? []).map((t) => `${t.x}|${t.y}`));
    const existing = plan.targets.filter((t) => known.has(`${t.x}|${t.y}`)).length;
    const fresh = plan.targets.length - existing;
    return (
      <>
        <div className="op-import-preview__head">
          <span className="op-import-preview__badge is-success">
            ✓ {plan.players[0]?.name || 'Player'}
          </span>
          <span className="op-import-preview__meta">
            {fresh} new {fresh === 1 ? 'village' : 'villages'}
            {existing > 0 ? ` · ${existing} already listed (will be updated)` : ''}
          </span>
        </div>
        <div className="op-import-preview__sub op-import-preview__sub--wrap">
          {plan.targets.map((t) => `${t.name} (${t.x}|${t.y})`).slice(0, 8).join(' · ')}
          {plan.targets.length > 8 ? ` · +${plan.targets.length - 8} more` : ''}
        </div>
      </>
    );
  };

  return (
    <div className="op-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`op-modal op-modal--import op-modal--import-${kind}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-plan-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="op-modal__header">
          <div>
            <h2 id="import-plan-title" className="op-modal__title">
              {copy.title}
            </h2>
            <p className="op-modal__subtitle">{copy.subtitle}</p>
          </div>
          <button type="button" className="op-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="op-import-form">
          <div className="op-modal__body">
            {kind === 'profile' && (
              <figure className="op-import-guide">
                <a
                  className="op-import-guide__shot"
                  href={profileCopyGuide}
                  target="_blank"
                  rel="noreferrer"
                  title="Open the example full size"
                >
                  <img
                    src={profileCopyGuide}
                    alt="A Thronewake player profile with the text selected from the player's name at the top down through the first rows of the Villages list"
                    width={840}
                    height={948}
                    loading="lazy"
                  />
                </a>
                <figcaption className="op-import-guide__steps">
                  <strong>What to copy</strong>
                  <ol>
                    <li>Open the player's profile in Thronewake.</li>
                    <li>Start selecting at the <b>start of their name</b> at the top.</li>
                    <li>Drag down into <b>Villages</b>, through as many villages as you want to add.</li>
                    <li>Copy, then paste it below.</li>
                  </ol>
                </figcaption>
              </figure>
            )}
            <div className="op-import-input-group">
              <div className="op-import-input-header">
                <label htmlFor="import-plan-text" className="op-import-label">
                  {copy.label}
                </label>
                <div className="op-import-quick-actions">
                  {kind === 'backup' && (
                    <>
                      <input
                        type="file"
                        accept=".json,application/json"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                      <button
                        type="button"
                        className="pill pill--tiny pill--secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        📁 Upload .json File
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="pill pill--tiny pill--secondary"
                    onClick={handlePasteClipboard}
                    title="Paste from your clipboard"
                  >
                    📋 Paste Clipboard
                  </button>
                </div>
              </div>

              <textarea
                id="import-plan-text"
                className="text-input op-import-textarea"
                rows={copy.rows}
                placeholder={copy.placeholder}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                autoFocus
              />
            </div>

            {inputText.trim().length > 0 && (
              <div className={`op-import-preview ${detected ? 'is-valid' : 'is-invalid'}`}>
                {renderPreview()}
              </div>
            )}

            {kind === 'backup' && (
              <div className="op-import-mode-options">
                <label className={`op-import-mode-card ${roomImportMode === 'merge' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="roomImportMode"
                    value="merge"
                    checked={roomImportMode === 'merge'}
                    onChange={() => setRoomImportMode('merge')}
                  />
                  <div className="op-import-mode-card__body">
                    <strong className="op-import-mode-card__title">Merge into this room</strong>
                    <p className="op-import-mode-card__desc">
                      Adds everything from the backup. Nothing in this room is removed.
                    </p>
                  </div>
                </label>

                <label
                  className={`op-import-mode-card is-danger ${roomImportMode === 'replace' ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="roomImportMode"
                    value="replace"
                    checked={roomImportMode === 'replace'}
                    onChange={() => setRoomImportMode('replace')}
                  />
                  <div className="op-import-mode-card__body">
                    <strong className="op-import-mode-card__title">Replace this room</strong>
                    <p className="op-import-mode-card__desc">
                      Throws away this room's current directory and operations and uses the backup instead.
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>

          <div className="op-modal__footer op-import-footer">
            <button type="button" className="pill pill--secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="pill pill--primary op-import-submit-btn"
              disabled={!detected}
            >
              {copy.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
