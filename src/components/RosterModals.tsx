import { useState, useEffect } from 'react';
import type { Attacker, Player, Target } from '../engine/operations';
import { enforceMaxSafeWindow, safeWindowDurationMinutes, parseClock } from '../engine/operations';
import { UnitGridPicker } from './UnitGridPicker';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface CoordInputProps {
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  disabled?: boolean;
}

export function CoordInput({ value, onChange, ariaLabel, disabled = false }: CoordInputProps) {
  const [localText, setLocalText] = useState(String(value));

  useEffect(() => {
    setLocalText(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalText(raw);
    if (raw === '' || raw === '-' || raw === '+') return;
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      onChange(Math.min(500, Math.max(-500, n)));
    }
  };

  const handleBlur = () => {
    const n = Number(localText);
    if (Number.isNaN(n) || localText.trim() === '') {
      setLocalText(String(value));
    } else {
      const clamped = Math.min(500, Math.max(-500, n));
      setLocalText(String(clamped));
      onChange(clamped);
    }
  };

  return (
    <input
      className="text-input text-input--coord"
      type="text"
      inputMode="numeric"
      disabled={disabled}
      aria-label={ariaLabel}
      value={localText}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

export function Time24Input({
  value,
  onChange,
  className = 'text-input text-input--time24',
  placeholder = '14:00',
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [localText, setLocalText] = useState(value);

  useEffect(() => {
    setLocalText(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalText(raw);
    if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(raw)) {
      onChange(raw);
    }
  };

  const handleBlur = () => {
    const match = /^(\d{1,2}):?(\d{0,2})$/.exec(localText.trim());
    if (match) {
      let h = parseInt(match[1], 10);
      let m = parseInt(match[2] || '0', 10);
      if (isNaN(h) || h < 0) h = 0;
      if (h > 23) h = 23;
      if (isNaN(m) || m < 0) m = 0;
      if (m > 59) m = 59;
      const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      setLocalText(formatted);
      onChange(formatted);
    } else {
      setLocalText(value);
    }
  };

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      disabled={disabled}
      placeholder={placeholder}
      value={localText}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

export function SafeTimeFields({
  owner,
  label = 'Safe Hours',
  onChange,
}: {
  owner: { safeEnabled: boolean; safeStart: string; safeEnd: string };
  label?: string;
  onChange: (patch: Partial<{ safeEnabled: boolean; safeStart: string; safeEnd: string }>) => void;
}) {
  const duration = safeWindowDurationMinutes(parseClock(owner.safeStart), parseClock(owner.safeEnd));
  const isCapped = duration >= 360;

  const handleStartChange = (val: string) => {
    const updated = enforceMaxSafeWindow(val, owner.safeEnd, 'start');
    onChange(updated);
  };

  const handleEndChange = (val: string) => {
    const updated = enforceMaxSafeWindow(owner.safeStart, val, 'end');
    onChange(updated);
  };

  return (
    <div className={`op-safetime ${owner.safeEnabled ? 'is-enabled' : 'is-disabled'}`}>
      <div className="op-safetime__header">
        <label className="op-toggle">
          <input
            type="checkbox"
            checked={owner.safeEnabled}
            onChange={(e) => onChange({ safeEnabled: e.target.checked })}
          />
          <span className="op-toggle__indicator" aria-hidden="true" />
          <span className="op-toggle__title">{label}</span>
        </label>
        <span className="op-safetime__tag">
          {owner.safeEnabled ? `${owner.safeStart}–${owner.safeEnd} UTC` : 'Disabled'}
        </span>
      </div>

      {owner.safeEnabled && (
        <div className="op-safetime__body">
          <div className="op-safetime__inputs">
            <label className="op-field-time">
              <span className="op-field-time__label">Start</span>
              <Time24Input
                value={owner.safeStart}
                onChange={handleStartChange}
                placeholder="22:00"
              />
            </label>
            <label className="op-field-time">
              <span className="op-field-time__label">End</span>
              <Time24Input
                value={owner.safeEnd}
                onChange={handleEndChange}
                placeholder="04:00"
              />
            </label>
          </div>

          <div className="op-safetime__footer-meta">
            <span className="op-safetime__window-type">
              ({Math.round(duration / 60)}h window{isCapped ? ' · 6h cap' : ''})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Alliance Armies Modal ──────────────────────────────────────────────────

export interface AttackerCardProps {
  attacker: Attacker;
  index: number;
  showUnitPicker?: boolean;
  onPatch: (patch: Partial<Attacker>) => void;
  onRemove: () => void;
}

export function AttackerCard({
  attacker,
  index,
  showUnitPicker = false,
  onPatch,
  onRemove,
}: AttackerCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <>
      <article className="op-strip-card op-strip-card--attacker op-roster-card" key={attacker.id}>
        <div className="op-strip-card__top">
          <div className="op-strip-card__identity">
            <span className="op-card__idx">#{index + 1}</span>
            <input
              className="text-input op-card__name"
              aria-label="Attacker name"
              placeholder="Player / Village Name"
              value={attacker.name}
              onChange={(e) => onPatch({ name: e.target.value })}
            />
            <div className="coord-inline">
              <label className="coord-field">
                <span className="coord-field__tag">X</span>
                <CoordInput
                  value={attacker.x}
                  onChange={(x) => onPatch({ x })}
                  ariaLabel="Attacker X coordinate"
                />
              </label>
              <label className="coord-field">
                <span className="coord-field__tag">Y</span>
                <CoordInput
                  value={attacker.y}
                  onChange={(y) => onPatch({ y })}
                  ariaLabel="Attacker Y coordinate"
                />
              </label>
            </div>
          </div>

          <div className="op-strip-card__military">
            {showUnitPicker && (
              <div className="op-strip-card__unit">
                <UnitGridPicker
                  unitRef={attacker.unitRef}
                  onChange={(unitRef) => onPatch({ unitRef })}
                />
              </div>
            )}

            <div className="op-strip-card__modifiers">
              <label className="op-modifier-inline" title="Speed Artifact">
                <span className="op-modifier-inline__tag">Artifact</span>
                <select
                  className="select op-select-solid-sm"
                  value={attacker.artifactMultiplier}
                  onChange={(e) =>
                    onPatch({
                      artifactMultiplier: Number(e.target.value) as Attacker['artifactMultiplier'],
                    })
                  }
                >
                  <option value={1}>1.0×</option>
                  <option value={1.5}>1.5×</option>
                  <option value={2}>2.0×</option>
                </select>
              </label>

              <label className="op-modifier-inline" title="Bannerfield Level (+20% speed per level beyond 20 fields)">
                <span className="op-modifier-inline__tag">Bannerfield</span>
                <input
                  className="text-input op-input-solid-sm"
                  type="number"
                  min={0}
                  max={20}
                  value={attacker.bannerfieldLevel}
                  onChange={(e) =>
                    onPatch({
                      bannerfieldLevel: Math.min(20, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                />
                <span className="bannerfield-bonus-tag-sm">+{attacker.bannerfieldLevel * 20}%</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            className="op-remove-danger"
            aria-label={`Remove ${attacker.name} from roster`}
            onClick={() => setIsConfirmingDelete(true)}
            title="Delete army"
          >
            🗑️ Delete
          </button>
        </div>

        <div className="op-strip-card__bottom">
          <SafeTimeFields
            owner={attacker}
            label="Attacker Safe Hours"
            onChange={(patch) => onPatch(patch)}
          />
        </div>
      </article>

      <ConfirmDeleteModal
        isOpen={isConfirmingDelete}
        title="Delete Attacker Army"
        message="Are you sure you want to delete this attacking army? It will be removed from all operations and master roster."
        itemDescription={`${attacker.name || 'Attacker'} (${attacker.x}|${attacker.y})`}
        confirmLabel="Delete Army"
        onConfirm={() => {
          setIsConfirmingDelete(false);
          onRemove();
        }}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </>
  );
}

// ── Alliance Armies Modal ──────────────────────────────────────────────────

interface AllianceArmiesModalProps {
  attackers: Attacker[];
  isOpen: boolean;
  onClose: () => void;
  onAddAttacker: () => void;
  onPatchAttacker: (id: string, patch: Partial<Attacker>) => void;
  onRemoveAttacker: (id: string) => void;
}

export function AllianceArmiesModal({
  attackers,
  isOpen,
  onClose,
  onAddAttacker,
  onPatchAttacker,
  onRemoveAttacker,
}: AllianceArmiesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="op-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="op-modal op-modal--roster" onClick={(e) => e.stopPropagation()}>
        <div className="op-modal__header">
          <div className="op-modal__title-wrap">
            <span className="op-modal__icon">🛡️</span>
            <div>
              <h2 className="op-modal__title">Alliance Army Roster ({attackers.length})</h2>
              <p className="op-modal__subtitle">
                Armies added here live in the master roster and can be selected across all operations.
              </p>
            </div>
          </div>
          <div className="op-modal__header-actions">
            <button type="button" className="pill pill--primary" onClick={onAddAttacker}>
              + Add Army
            </button>
            <button type="button" className="op-modal-close" onClick={onClose} aria-label="Close roster modal">
              ✕
            </button>
          </div>
        </div>

        <div className="op-modal__body">
          {attackers.length === 0 ? (
            <div className="op-modal__empty">No armies in roster. Click "+ Add Army" above to create one.</div>
          ) : (
            <div className="op-strip-list">
              {attackers.map((attacker, index) => (
                <AttackerCard
                  key={attacker.id}
                  attacker={attacker}
                  index={index}
                  onPatch={(patch) => onPatchAttacker(attacker.id, patch)}
                  onRemove={() => onRemoveAttacker(attacker.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="op-modal__footer">
          <button type="button" className="pill pill--primary" onClick={onClose}>
            Done / Save Roster
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Defender Player Group Card ─────────────────────────────────────────────

export interface PlayerGroupCardProps {
  player: Player;
  pIdx: number;
  targets: Target[];
  onPatchPlayer: (patch: Partial<Player>) => void;
  onRemovePlayer: () => void;
  onAddVillage: () => void;
  onPatchTarget: (targetId: string, patch: Partial<Target>) => void;
  onRemoveTarget: (targetId: string) => void;
}

export function PlayerGroupCard({
  player,
  pIdx,
  targets,
  onPatchPlayer,
  onRemovePlayer,
  onAddVillage,
  onPatchTarget,
  onRemoveTarget,
}: PlayerGroupCardProps) {
  const [isConfirmingDeletePlayer, setIsConfirmingDeletePlayer] = useState(false);
  const [deletingTarget, setDeletingTarget] = useState<Target | null>(null);
  const playerVillages = targets.filter((t) => t.playerId === player.id);

  return (
    <>
      <div className="op-target-group is-player op-roster-target-group" key={player.id}>
        <div className="op-target-group__head">
          <div className="op-target-group__player-title">
            <span className="op-target-group__icon">👤</span>
            <span className="op-card__idx">#{pIdx + 1}</span>
            <input
              className="text-input op-player__name"
              aria-label="Defender account name"
              value={player.name}
              onChange={(e) => onPatchPlayer({ name: e.target.value })}
              placeholder="Defender Account Name"
            />
            <span className="op-target-group__meta">
              {playerVillages.length} {playerVillages.length === 1 ? 'village' : 'villages'}
            </span>
          </div>

          <div className="op-target-group__player-safetime">
            <SafeTimeFields
              owner={player}
              label={`${player.name || 'Defender'} Safe Hours`}
              onChange={(patch) => onPatchPlayer(patch)}
            />
          </div>

          <div className="op-target-group__actions">
            <button
              type="button"
              className="pill pill--tiny pill--primary"
              onClick={onAddVillage}
            >
              + Add Village
            </button>
            <button
              type="button"
              className="op-remove-danger op-remove-danger--sm"
              aria-label={`Delete ${player.name} and all attached villages`}
              onClick={() => setIsConfirmingDeletePlayer(true)}
              title="Delete entire defender account"
            >
              🗑️ Delete Account
            </button>
          </div>
        </div>

        <div className="op-strip-list">
          {playerVillages.map((target, vIdx) => (
            <article
              className={`op-strip-card op-strip-card--target ${target.fake ? 'is-fake' : 'is-real'}`}
              key={target.id}
            >
              <div className="op-strip-card__identity">
                <span className="op-card__idx">#{vIdx + 1}</span>
                <input
                  className="text-input op-card__name"
                  aria-label="Village name"
                  placeholder="Village name"
                  value={target.name}
                  onChange={(e) => onPatchTarget(target.id, { name: e.target.value })}
                />
                <div className="coord-inline">
                  <label className="coord-field">
                    <span className="coord-field__tag">X</span>
                    <CoordInput
                      value={target.x}
                      onChange={(x) => onPatchTarget(target.id, { x })}
                      ariaLabel="Village X coordinate"
                    />
                  </label>
                  <label className="coord-field">
                    <span className="coord-field__tag">Y</span>
                    <CoordInput
                      value={target.y}
                      onChange={(y) => onPatchTarget(target.id, { y })}
                      ariaLabel="Village Y coordinate"
                    />
                  </label>
                </div>
              </div>

              <div className="op-strip-card__target-meta">
                <div className="op-fake-group" role="group" aria-label="Attack type">
                  <button
                    type="button"
                    className={`pill pill--tiny op-fake-pill ${target.fake ? '' : 'is-real'}`}
                    aria-pressed={!target.fake}
                    onClick={() => onPatchTarget(target.id, { fake: false })}
                  >
                    Real
                  </button>
                  <button
                    type="button"
                    className={`pill pill--tiny op-fake-pill ${target.fake ? 'is-fake' : ''}`}
                    aria-pressed={target.fake}
                    onClick={() => onPatchTarget(target.id, { fake: true })}
                  >
                    Fake
                  </button>
                </div>

                <button
                  type="button"
                  className="op-remove-danger op-remove-danger--sm"
                  aria-label={`Remove ${target.name}`}
                  onClick={() => setDeletingTarget(target)}
                  title="Delete village"
                >
                  🗑️
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={isConfirmingDeletePlayer}
        title="Delete Defender Account"
        message={`Are you sure you want to delete this defender account and all ${playerVillages.length} attached village(s)? All planned attacks against this account will be removed.`}
        itemDescription={`${player.name || 'Defender'} (${playerVillages.length} ${playerVillages.length === 1 ? 'village' : 'villages'})`}
        confirmLabel="Delete Account"
        onConfirm={() => {
          setIsConfirmingDeletePlayer(false);
          onRemovePlayer();
        }}
        onCancel={() => setIsConfirmingDeletePlayer(false)}
      />

      <ConfirmDeleteModal
        isOpen={deletingTarget !== null}
        title="Delete Village"
        message="Are you sure you want to delete this target village? Any planned attacks on this village will be removed."
        itemDescription={`${deletingTarget?.name || 'Village'} (${deletingTarget?.x}|${deletingTarget?.y})`}
        confirmLabel="Delete Village"
        onConfirm={() => {
          if (deletingTarget) {
            onRemoveTarget(deletingTarget.id);
            setDeletingTarget(null);
          }
        }}
        onCancel={() => setDeletingTarget(null)}
      />
    </>
  );
}

// ── Target Database Modal ──────────────────────────────────────────────────

interface TargetDatabaseModalProps {
  players: Player[];
  targets: Target[];
  isOpen: boolean;
  onClose: () => void;
  onAddPlayer: () => void;
  onPatchPlayer: (id: string, patch: Partial<Player>) => void;
  onRemovePlayer: (id: string) => void;
  onAddVillage: (playerId: string) => void;
  onPatchTarget: (id: string, patch: Partial<Target>) => void;
  onRemoveTarget: (id: string) => void;
}

export function TargetDatabaseModal({
  players,
  targets,
  isOpen,
  onClose,
  onAddPlayer,
  onPatchPlayer,
  onRemovePlayer,
  onAddVillage,
  onPatchTarget,
  onRemoveTarget,
}: TargetDatabaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="op-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="op-modal op-modal--roster" onClick={(e) => e.stopPropagation()}>
        <div className="op-modal__header">
          <div className="op-modal__title-wrap">
            <span className="op-modal__icon">🎯</span>
            <div>
              <h2 className="op-modal__title">
                Enemy Target Database ({players.length} Accounts · {targets.length} Villages)
              </h2>
              <p className="op-modal__subtitle">
                Defender accounts & villages defined here can be targeted across multiple operations.
              </p>
            </div>
          </div>
          <div className="op-modal__header-actions">
            <button type="button" className="pill pill--primary" onClick={onAddPlayer}>
              + Add Defender Account
            </button>
            <button type="button" className="op-modal-close" onClick={onClose} aria-label="Close targets modal">
              ✕
            </button>
          </div>
        </div>

        <div className="op-modal__body">
          {players.length === 0 ? (
            <div className="op-modal__empty">No defender accounts. Click "+ Add Defender Account" above.</div>
          ) : (
            <div className="op-defenders-list">
              {players.map((player, pIdx) => (
                <PlayerGroupCard
                  key={player.id}
                  player={player}
                  pIdx={pIdx}
                  targets={targets}
                  onPatchPlayer={(patch) => onPatchPlayer(player.id, patch)}
                  onRemovePlayer={() => onRemovePlayer(player.id)}
                  onAddVillage={() => onAddVillage(player.id)}
                  onPatchTarget={onPatchTarget}
                  onRemoveTarget={onRemoveTarget}
                />
              ))}
            </div>
          )}
        </div>

        <div className="op-modal__footer">
          <button type="button" className="pill pill--primary" onClick={onClose}>
            Done / Save Targets
          </button>
        </div>
      </div>
    </div>
  );
}

