import { useState, useEffect, useMemo, useRef } from 'react';
import type { PlannerState, TeamRoomData } from '../engine/operations';
import {
  decodeCompactPlan,
  parseRoomBackup,
  parseThronewakeProfileClipboard,
  type ImportMode,
} from '../engine/operations';
import { decodeState } from '../pages/OperationPlanner';

interface ImportPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (plan: PlannerState, mode: ImportMode, customWaveName?: string) => void;
  onImportRoom?: (data: TeamRoomData, mode: 'replace' | 'merge') => void;
}

export function ImportPlanModal({ isOpen, onClose, onImport, onImportRoom }: ImportPlanModalProps) {
  const [inputText, setInputText] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('new_wave');
  const [roomImportMode, setRoomImportMode] = useState<'replace' | 'merge'>('replace');
  const [customWaveName, setCustomWaveName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setInputText('');
      setImportMode('new_wave');
      setRoomImportMode('replace');
      setCustomWaveName('');
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Live decoding & validation
  const parsedResult = useMemo<{
    isValid: boolean;
    error?: string;
    plan?: PlannerState;
    roomData?: TeamRoomData;
    sourceType?: 'room_backup' | 'profile' | 'link';
  }>(() => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      return { isValid: false };
    }

    try {
      // 1. Try parsing as full Room Backup JSON
      const roomBackup = parseRoomBackup(trimmed);
      if (roomBackup) {
        return {
          isValid: true,
          roomData: roomBackup,
          sourceType: 'room_backup',
        };
      }

      // 2. Try parsing as in-game Thronewake player profile clipboard or village list
      const profilePlan = parseThronewakeProfileClipboard(trimmed);
      if (profilePlan && profilePlan.targets.length > 0) {
        return {
          isValid: true,
          plan: profilePlan,
          sourceType: 'profile',
        };
      }

      // 3. Try parsing as shared URL or compact plan code
      let hash = trimmed;
      if (hash.includes('#')) {
        hash = hash.substring(hash.indexOf('#') + 1);
      } else if (hash.includes('?')) {
        hash = hash.substring(hash.indexOf('?') + 1);
      }

      const queryString = hash.includes('p=') || hash.includes('plan=') ? hash : `p=${hash}`;
      const params = new URLSearchParams(queryString);
      const compactParam = params.get('p');
      const rawPlanParam = params.get('plan');

      let plan: PlannerState | null = null;

      if (compactParam) {
        const compactParsed = decodeCompactPlan(compactParam);
        if (compactParsed) {
          plan = decodeState(`p=${encodeURIComponent(compactParam)}`);
        }
      } else if (rawPlanParam) {
        plan = decodeState(`plan=${encodeURIComponent(rawPlanParam)}`);
      }

      if (!plan) {
        return {
          isValid: false,
          error: 'Could not detect room backup JSON, Thronewake profile, or decode plan from the provided link.',
        };
      }

      // Check if it actually contains real parsed armies or targets
      const hasAttackers = plan.attackers && plan.attackers.length > 0;
      const hasTargets = plan.targets && plan.targets.length > 0;

      if (!hasAttackers && !hasTargets) {
        return {
          isValid: false,
          error: 'No armies or target villages found in the provided link/code.',
        };
      }

      return {
        isValid: true,
        plan,
        sourceType: 'link',
      };
    } catch (err: unknown) {
      return {
        isValid: false,
        error: err instanceof Error ? err.message : 'Invalid plan format.',
      };
    }
  }, [inputText]);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text.trim());
      }
    } catch {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text === 'string') {
        setInputText(text.trim());
      }
    };
    reader.readAsText(file);
  };

  const handleGrabCurrentUrl = () => {
    const currentHash = window.location.hash;
    if (currentHash && currentHash.length > 2) {
      setInputText(currentHash);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedResult.isValid) return;

    if (parsedResult.sourceType === 'room_backup' && parsedResult.roomData) {
      onImportRoom?.(parsedResult.roomData, roomImportMode);
      onClose();
      return;
    }

    if (parsedResult.plan) {
      onImport(parsedResult.plan, importMode, customWaveName.trim() || undefined);
      onClose();
    }
  };

  if (!isOpen) return null;

  const plan = parsedResult.plan;
  const roomData = parsedResult.roomData;

  return (
    <div className="op-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="op-modal op-modal--import"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-plan-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="op-modal__header">
          <div>
            <h2 id="import-plan-title" className="op-modal__title">
              📥 Import Plan or Room Backup
            </h2>
            <p className="op-modal__desc">
              Paste a shared plan link, full room backup JSON, upload a <code>.json</code> file, or paste in-game player profile text.
            </p>
          </div>
          <button
            type="button"
            className="op-modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="op-import-form">

          {/* URL / Code / Profile Input */}
          <div className="op-import-input-group">
            <div className="op-import-input-header">
              <label htmlFor="import-plan-text" className="op-import-label">
                Shared URL, Plan Code, Room Backup JSON, or In-Game Profile
              </label>
              <div className="op-import-quick-actions">
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
                  title="Upload room backup .json file"
                >
                  📁 Upload .json File
                </button>
                <button
                  type="button"
                  className="pill pill--tiny pill--secondary"
                  onClick={handlePasteClipboard}
                  title="Paste text or link from your clipboard"
                >
                  📋 Paste Clipboard
                </button>
                {window.location.hash.length > 2 && (
                  <button
                    type="button"
                    className="pill pill--tiny pill--secondary"
                    onClick={handleGrabCurrentUrl}
                    title="Use plan hash currently in browser URL"
                  >
                    📍 Use Current Page
                  </button>
                )}
              </div>
            </div>

            <textarea
              id="import-plan-text"
              className="text-input op-import-textarea"
              rows={4}
              placeholder="Paste plan link (#p=...), full room backup JSON, or in-game player profile (e.g. Gugl / Byzantion (-8|-33))..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              autoFocus
            />
          </div>

          {/* Live Validation Preview */}
          {inputText.trim().length > 0 && (
            <div className={`op-import-preview ${parsedResult.isValid ? 'is-valid' : 'is-invalid'}`}>
              {parsedResult.isValid ? (
                parsedResult.sourceType === 'room_backup' && roomData ? (
                  <>
                    <div className="op-import-preview__head">
                      <span className="op-import-preview__badge is-success">✓ Full Room Backup Detected</span>
                      <span className="op-import-preview__meta">
                        Room: <strong>{roomData.roomName || 'Team Room'}</strong>
                      </span>
                    </div>
                    <div className="op-import-preview__grid">
                      <div className="op-import-preview__stat">
                        <div className="op-import-preview__stat-title">🛡️ {roomData.roster.attackers.length} Master Armies</div>
                        <span className="op-import-preview__sub">
                          {roomData.roster.attackers.map((a) => a.name).slice(0, 3).join(', ')}
                          {roomData.roster.attackers.length > 3 ? ` +${roomData.roster.attackers.length - 3} more` : ''}
                        </span>
                      </div>
                      <div className="op-import-preview__stat">
                        <div className="op-import-preview__stat-title">🎯 {roomData.roster.targets.length} Villages ({roomData.roster.players.length} Defenders)</div>
                        <span className="op-import-preview__sub">
                          {roomData.operations.length} Operation Waves
                        </span>
                      </div>
                    </div>
                  </>
                ) : parsedResult.sourceType === 'profile' && plan ? (
                  <>
                    <div className="op-import-preview__head">
                      <span className="op-import-preview__badge is-success">✓ Thronewake Profile Detected</span>
                      <span className="op-import-preview__meta">
                        👤 Defender: <strong>{plan.players[0]?.name || 'Defender'}</strong> &nbsp;·&nbsp; {plan.targets.length} Villages
                      </span>
                    </div>
                    <div className="op-import-preview__grid">
                      <div className="op-import-preview__stat" style={{ gridColumn: '1 / -1' }}>
                        <div className="op-import-preview__stat-title">🎯 {plan.targets.length} Target Villages Extracted</div>
                        <span className="op-import-preview__sub">
                          {plan.targets.map((t) => `${t.name} (${t.x}|${t.y})`).slice(0, 6).join(' · ')}
                          {plan.targets.length > 6 ? ` · +${plan.targets.length - 6} more` : ''}
                        </span>
                      </div>
                    </div>
                  </>
                ) : plan ? (
                  <>
                    <div className="op-import-preview__head">
                      <span className="op-import-preview__badge is-success">✓ Valid Plan</span>
                      <span className="op-import-preview__meta">
                        🕐 {plan.landing.replace('T', ' ')} UTC &nbsp;·&nbsp; {plan.serverSpeed}× Speed
                      </span>
                    </div>
                    <div className="op-import-preview__grid">
                      <div className="op-import-preview__stat">
                        <div className="op-import-preview__stat-title">🛡️ {plan.attackers.length} {plan.attackers.length === 1 ? 'Army' : 'Armies'}</div>
                        <span className="op-import-preview__sub">
                          {plan.attackers.map((a) => a.name || 'Army').slice(0, 4).join(', ')}
                          {plan.attackers.length > 4 ? ` +${plan.attackers.length - 4} more` : ''}
                        </span>
                      </div>
                      <div className="op-import-preview__stat">
                        <div className="op-import-preview__stat-title">🎯 {plan.targets.length} {plan.targets.length === 1 ? 'Village' : 'Villages'}</div>
                        <span className="op-import-preview__sub">
                          {plan.players.length} {plan.players.length === 1 ? 'account' : 'accounts'} · {plan.targets.filter((t) => !t.fake).length} real, {plan.targets.filter((t) => t.fake).length} fake
                        </span>
                      </div>
                    </div>
                  </>
                ) : null
              ) : (
                <div className="op-import-preview__error">
                  ⚠️ {parsedResult.error || 'Invalid or unrecognized plan format.'}
                </div>
              )}
            </div>
          )}

          {/* Import Mode Selection */}
          {parsedResult.sourceType === 'room_backup' ? (
            <div className="op-import-mode-section">
              <span className="op-import-mode-label">Room Backup Action</span>
              <div className="op-import-mode-options">
                <label className={`op-import-mode-card ${roomImportMode === 'replace' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="roomImportMode"
                    value="replace"
                    checked={roomImportMode === 'replace'}
                    onChange={() => setRoomImportMode('replace')}
                  />
                  <div className="op-import-mode-card__body">
                    <strong className="op-import-mode-card__title">
                      🌊 Replace & Restore Room
                      <span className="pill pill--tiny pill--primary">Recommended</span>
                    </strong>
                    <p className="op-import-mode-card__desc">
                      Replaces current master directory hammers, targets, and operation waves with this backup.
                    </p>
                  </div>
                </label>

                <label className={`op-import-mode-card ${roomImportMode === 'merge' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="roomImportMode"
                    value="merge"
                    checked={roomImportMode === 'merge'}
                    onChange={() => setRoomImportMode('merge')}
                  />
                  <div className="op-import-mode-card__body">
                    <strong className="op-import-mode-card__title">
                      👥 Merge with Current Room
                    </strong>
                    <p className="op-import-mode-card__desc">
                      Losslessly unions all master directory armies, defenders, targets, and waves into your active room.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <div className="op-import-mode-section">
              <span className="op-import-mode-label">Import Action</span>
              <div className="op-import-mode-options">
                <label className={`op-import-mode-card ${importMode === 'new_wave' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="importMode"
                    value="new_wave"
                    checked={importMode === 'new_wave'}
                    onChange={() => setImportMode('new_wave')}
                  />
                  <div className="op-import-mode-card__body">
                    <strong className="op-import-mode-card__title">
                      🌊 Add as New Operation Wave
                      <span className="pill pill--tiny pill--primary">Recommended</span>
                    </strong>
                    <p className="op-import-mode-card__desc">
                      Merges armies & targets into the Master Roster and creates a new wave with this plan's timing and assignments.
                    </p>
                  </div>
                </label>

                <label className={`op-import-mode-card ${importMode === 'merge_only' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="importMode"
                    value="merge_only"
                    checked={importMode === 'merge_only'}
                    onChange={() => setImportMode('merge_only')}
                  />
                  <div className="op-import-mode-card__body">
                    <strong className="op-import-mode-card__title">
                      👥 Merge into Master Roster Only
                    </strong>
                    <p className="op-import-mode-card__desc">
                      Adds armies and targets to your room's database without creating a new operation wave.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Optional Wave Name (only for single-plan imports) */}
          {parsedResult.sourceType !== 'room_backup' && importMode === 'new_wave' && (
            <div className="op-import-name-group">
              <label htmlFor="import-wave-name" className="op-import-label">
                Wave Name <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
              </label>
              <input
                id="import-wave-name"
                type="text"
                className="text-input"
                placeholder="e.g. Wave 2 – Flank Attack"
                value={customWaveName}
                onChange={(e) => setCustomWaveName(e.target.value)}
              />
            </div>
          )}

          <div className="op-modal__actions">
            <button type="button" className="pill pill--secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="pill pill--primary op-import-submit-btn"
              disabled={!parsedResult.isValid}
            >
              📥 Import Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
