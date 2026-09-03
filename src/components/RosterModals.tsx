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
  compact = false,
  onChange,
}: {
  owner: { safeEnabled: boolean; safeStart: string; safeEnd: string };
  label?: string;
  compact?: boolean;
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

  if (compact) {
    return (
      <div className={`op-safetime-compact ${owner.safeEnabled ? 'is-enabled' : 'is-disabled'}`}>
        <label className="op-safetime-compact__toggle" title={owner.safeEnabled ? 'Safe hours active. Click to disable.' : 'Safe hours disabled. Click to activate.'}>
          <input
            type="checkbox"
            checked={owner.safeEnabled}
            onChange={(e) => onChange({ safeEnabled: e.target.checked })}
          />
          <span className="op-safetime-compact__label">Safe:</span>
        </label>
        {owner.safeEnabled ? (
          <div className="op-safetime-compact__inputs">
            <Time24Input
              value={owner.safeStart}
              onChange={handleStartChange}
              placeholder="22:00"
            />
            <span className="op-safetime-compact__sep">–</span>
            <Time24Input
              value={owner.safeEnd}
              onChange={handleEndChange}
              placeholder="04:00"
            />
            <span className="op-safetime-compact__meta">
              UTC ({Math.round(duration / 60)}h{isCapped ? ' max' : ''})
            </span>
          </div>
        ) : (
          <span className="op-safetime-compact__off">Off</span>
        )}
      </div>
    );
  }

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

// ── Alliance Member Player Group Card ──────────────────────────────────────

export interface AttackerPlayerGroupCardProps {
  player: Player;
  pIdx: number;
  attackers: Attacker[];
  defaultExpanded?: boolean;
  onPatchPlayer: (patch: Partial<Player>) => void;
  onRemovePlayer: () => void;
  onAddHammer: () => void;
  onPatchAttacker: (attackerId: string, patch: Partial<Attacker>) => void;
  onRemoveAttacker: (attackerId: string) => void;
}

export function AttackerPlayerGroupCard({
  player,
  pIdx,
  attackers,
  defaultExpanded = false,
  onPatchPlayer,
  onRemovePlayer,
  onAddHammer,
  onPatchAttacker,
  onRemoveAttacker,
}: AttackerPlayerGroupCardProps) {
  const [isConfirmingDeletePlayer, setIsConfirmingDeletePlayer] = useState(false);
  const [deletingAttacker, setDeletingAttacker] = useState<Attacker | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const playerHammers = attackers.filter((a) => a.playerId === player.id);

  const handleAddHammer = () => {
    setIsExpanded(true);
    onAddHammer();
  };

  return (
    <>
      <div className="op-target-group is-player op-roster-target-group" key={player.id}>
        <div className="op-target-group__head">
          <div className="op-target-group__player-title">
            <span className="op-target-group__icon" aria-hidden="true">👤</span>
            <span className="op-card__idx">#{pIdx + 1}</span>
            <input
              className="text-input op-player__name"
              aria-label="Alliance member name"
              value={player.name}
              onChange={(e) => onPatchPlayer({ name: e.target.value })}
              placeholder="Member Account Name"
            />
            <SafeTimeFields
              owner={player}
              compact={true}
              onChange={(patch) => onPatchPlayer(patch)}
            />
          </div>

          <div className="op-target-group__actions">
            <button
              type="button"
              className="pill pill--tiny pill--primary"
              onClick={handleAddHammer}
            >
              + Add Hammer
            </button>
            <button
              type="button"
              className="op-remove-danger op-remove-danger--sm"
              aria-label={`Delete member ${player.name}`}
              onClick={() => setIsConfirmingDeletePlayer(true)}
              title="Delete member account"
            >
              🗑️
            </button>
          </div>
        </div>

        <div className="op-group-dropdown-bar">
          <button
            type="button"
            className="pill pill--tiny pill--secondary op-group-dropdown-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            title={isExpanded ? 'Collapse hammer details' : 'Expand hammer details'}
          >
            🔨 {playerHammers.length} {playerHammers.length === 1 ? 'hammer' : 'hammers'} {isExpanded ? '▲' : '▼'}
          </button>
        </div>

        {isExpanded && (
          <div className="op-strip-list">
            {playerHammers.length === 0 ? (
              <div className="op-villages-empty">
                No hammers for this member. Click "+ Add Hammer" above to register one.
              </div>
            ) : (
              playerHammers.map((attacker, hIdx) => (
                <article
                  className="op-strip-card op-strip-card--attacker op-strip-card--attacker-row"
                  key={attacker.id}
                >
                  <div className="op-strip-card__identity">
                    <span className="op-card__idx">#{hIdx + 1}</span>
                    <input
                      className="text-input op-card__name"
                      aria-label="Hammer name"
                      placeholder="Hammer name"
                      value={attacker.name}
                      onChange={(e) => onPatchAttacker(attacker.id, { name: e.target.value })}
                    />
                    <div className="coord-inline">
                      <label className="coord-field">
                        <span className="coord-field__tag">X</span>
                        <CoordInput
                          value={attacker.x}
                          onChange={(x) => onPatchAttacker(attacker.id, { x })}
                          ariaLabel="Hammer X coordinate"
                        />
                      </label>
                      <label className="coord-field">
                        <span className="coord-field__tag">Y</span>
                        <CoordInput
                          value={attacker.y}
                          onChange={(y) => onPatchAttacker(attacker.id, { y })}
                          ariaLabel="Hammer Y coordinate"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="op-strip-card__military">
                    <div className="op-strip-card__modifiers">
                      <label className="op-modifier-inline" title="Speed Artifact">
                        <span className="op-modifier-inline__tag">Artifact</span>
                        <select
                          className="select op-select-solid-sm"
                          value={attacker.artifactMultiplier}
                          onChange={(e) =>
                            onPatchAttacker(attacker.id, {
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
                            onPatchAttacker(attacker.id, {
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
                    className="op-remove-danger op-remove-danger--sm"
                    aria-label={`Delete hammer ${attacker.name}`}
                    onClick={() => setDeletingAttacker(attacker)}
                    title="Delete hammer"
                  >
                    🗑️
                  </button>
                </article>
              ))
            )}
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={isConfirmingDeletePlayer}
        title="Delete Alliance Member"
        message={`Are you sure you want to delete member account "${player.name}"? All ${playerHammers.length} hammers belonging to this member will also be removed from the master roster.`}
        confirmLabel="Delete Member & Hammers"
        onConfirm={() => {
          setIsConfirmingDeletePlayer(false);
          onRemovePlayer();
        }}
        onCancel={() => setIsConfirmingDeletePlayer(false)}
      />

      <ConfirmDeleteModal
        isOpen={deletingAttacker !== null}
        title="Delete Hammer"
        message="Are you sure you want to delete this hammer? It will be removed from all operations and the master roster."
        itemDescription={
          deletingAttacker ? `${deletingAttacker.name || 'Hammer'} (${deletingAttacker.x}|${deletingAttacker.y})` : ''
        }
        confirmLabel="Delete Hammer"
        onConfirm={() => {
          if (deletingAttacker) {
            onRemoveAttacker(deletingAttacker.id);
            setDeletingAttacker(null);
          }
        }}
        onCancel={() => setDeletingAttacker(null)}
      />
    </>
  );
}

// ── Alliance Armies Modal ──────────────────────────────────────────────────

export interface AllianceArmiesModalProps {
  attackers: Attacker[];
  attackerPlayers?: Player[];
  isOpen: boolean;
  onClose: () => void;
  onAddAttackerPlayer?: () => void;
  onPatchAttackerPlayer?: (id: string, patch: Partial<Player>) => void;
  onRemoveAttackerPlayer?: (id: string) => void;
  onAddAttacker: (playerId?: string) => void;
  onPatchAttacker: (id: string, patch: Partial<Attacker>) => void;
  onRemoveAttacker: (id: string) => void;
}

export function AllianceArmiesModal({
  attackers,
  attackerPlayers = [],
  isOpen,
  onClose,
  onAddAttackerPlayer,
  onPatchAttackerPlayer,
  onRemoveAttackerPlayer,
  onAddAttacker,
  onPatchAttacker,
  onRemoveAttacker,
}: AllianceArmiesModalProps) {
  if (!isOpen) return null;

  const hasPlayers = attackerPlayers.length > 0;
  const unassignedAttackers = attackers.filter(
    (a) => !a.playerId || !attackerPlayers.some((p) => p.id === a.playerId),
  );

  return (
    <div className="op-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="op-modal op-modal--roster" onClick={(e) => e.stopPropagation()}>
        <div className="op-modal__header">
          <div className="op-modal__title-wrap">
            <span className="op-modal__icon">🔨</span>
            <div>
              <h2 className="op-modal__title">Alliance Hammer Directory ({attackers.length} Registered)</h2>
              <p className="op-modal__subtitle">
                Register alliance members and their hammer villages here. Members define their safe hours once, and all their hammers inherit that sleep schedule.
              </p>
            </div>
          </div>
          <div className="op-modal__header-actions">
            <button
              type="button"
              className="pill pill--primary"
              onClick={onAddAttackerPlayer || (() => onAddAttacker())}
            >
              + Add Member
            </button>
            <button type="button" className="op-modal-close" onClick={onClose} aria-label="Close roster modal">
              ✕
            </button>
          </div>
        </div>

        <div className="op-modal__body">
          {attackers.length === 0 && !hasPlayers ? (
            <div className="op-modal__empty">
              No armies or members registered in master directory.{' '}
              {onAddAttackerPlayer ? (
                <button type="button" className="btn-link" onClick={onAddAttackerPlayer}>
                  Click "+ Add Member" to start
                </button>
              ) : (
                'Click "+ Add Hammer" above.'
              )}
            </div>
          ) : (
            <div className="op-targets-list">
              {/* Member Accounts with their hammers */}
              {hasPlayers &&
                attackerPlayers.map((player, pIdx) => (
                  <AttackerPlayerGroupCard
                    key={player.id}
                    player={player}
                    pIdx={pIdx}
                    attackers={attackers}
                    defaultExpanded={true}
                    onPatchPlayer={(patch) => onPatchAttackerPlayer?.(player.id, patch)}
                    onRemovePlayer={() => onRemoveAttackerPlayer?.(player.id)}
                    onAddHammer={() => onAddAttacker(player.id)}
                    onPatchAttacker={onPatchAttacker}
                    onRemoveAttacker={onRemoveAttacker}
                  />
                ))}

              {/* Standalone / Unassigned Hammers */}
              {unassignedAttackers.length > 0 && (
                <div className="op-unassigned-villages op-roster-target-group">
                  <div className="op-unassigned-villages__header">
                    <span className="op-target-group__icon">⚔️</span>
                    <strong>
                      {hasPlayers ? 'Standalone / Unassigned Armies' : 'Registered Armies'} ({unassignedAttackers.length})
                    </strong>
                  </div>
                  <div className="op-strip-list">
                    {unassignedAttackers.map((attacker, index) => (
                      <AttackerCard
                        key={attacker.id}
                        attacker={attacker}
                        index={index}
                        onPatch={(patch) => onPatchAttacker(attacker.id, patch)}
                        onRemove={() => onRemoveAttacker(attacker.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="op-modal__footer">
          <button type="button" className="pill pill--primary" onClick={onClose}>
            Done / Save Directory
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
  defaultExpanded?: boolean;
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
  defaultExpanded = true,
  onPatchPlayer,
  onRemovePlayer,
  onAddVillage,
  onPatchTarget,
  onRemoveTarget,
}: PlayerGroupCardProps) {
  const [isConfirmingDeletePlayer, setIsConfirmingDeletePlayer] = useState(false);
  const [deletingTarget, setDeletingTarget] = useState<Target | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const playerVillages = targets.filter((t) => t.playerId === player.id);

  const handleAddVillage = () => {
    setIsExpanded(true);
    onAddVillage();
  };

  return (
    <>
      <div className="op-target-group is-player op-roster-target-group" key={player.id}>
        <div className="op-target-group__head">
          <div className="op-target-group__player-title">
            <span className="op-target-group__icon" aria-hidden="true">👤</span>
            <span className="op-card__idx">#{pIdx + 1}</span>
            <input
              className="text-input op-player__name"
              aria-label="Defender account name"
              value={player.name}
              onChange={(e) => onPatchPlayer({ name: e.target.value })}
              placeholder="Defender Account Name"
            />
            <SafeTimeFields
              owner={player}
              compact={true}
              onChange={(patch) => onPatchPlayer(patch)}
            />
          </div>

          <div className="op-target-group__actions">
            <button
              type="button"
              className="pill pill--tiny pill--primary"
              onClick={handleAddVillage}
            >
              + Add Village
            </button>
            <button
              type="button"
              className="op-remove-danger op-remove-danger--sm"
              aria-label={`Delete defender ${player.name}`}
              onClick={() => setIsConfirmingDeletePlayer(true)}
              title="Delete defender account"
            >
              🗑️
            </button>
          </div>
        </div>

        <div className="op-group-dropdown-bar">
          <button
            type="button"
            className="pill pill--tiny pill--secondary op-group-dropdown-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            title={isExpanded ? 'Collapse village details' : 'Expand village details'}
          >
            🏘️ {playerVillages.length} {playerVillages.length === 1 ? 'village' : 'villages'} {isExpanded ? '▲' : '▼'}
          </button>
        </div>

        {isExpanded && (
          <div className="op-strip-list">
            {playerVillages.length === 0 ? (
              <div className="op-villages-empty">
                No villages for this defender. Click "+ Add Village" above to add one.
              </div>
            ) : (
              playerVillages.map((target, vIdx) => (
                <article
                  className="op-strip-card op-strip-card--target"
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
              ))
            )}
          </div>
        )}
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
  const [expandAll, setExpandAll] = useState<boolean | null>(null);

  if (!isOpen) return null;

  return (
    <div className="op-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="op-modal op-modal--roster" onClick={(e) => e.stopPropagation()}>
        <div className="op-modal__header">
          <div className="op-modal__title-wrap">
            <span className="op-modal__icon">🎯</span>
            <div>
              <h2 className="op-modal__title">
                Enemy Target Directory ({players.length} Accounts · {targets.length} Villages)
              </h2>
              <p className="op-modal__subtitle">
                Register defender accounts and target villages here. Any village saved in this master directory can be targeted across multiple operation waves.
              </p>
            </div>
          </div>
          <div className="op-modal__header-actions">
            {players.length > 0 && (
              <button
                type="button"
                className="pill pill--tiny pill--secondary"
                onClick={() => setExpandAll((prev) => (prev === true ? false : true))}
                title={expandAll === true ? 'Collapse all village lists' : 'Expand all village lists'}
              >
                {expandAll === true ? 'Collapse All' : 'Expand All'}
              </button>
            )}
            <button type="button" className="pill pill--primary" onClick={onAddPlayer}>
              + Add Defender
            </button>
            <button type="button" className="op-modal-close" onClick={onClose} aria-label="Close targets modal">
              ✕
            </button>
          </div>
        </div>

        <div className="op-modal__body">
          {players.length === 0 ? (
            <div className="op-modal__empty">No defender accounts in directory. Click "+ Add Defender" above.</div>
          ) : (
            <div className="op-defenders-list">
              {players.map((player, pIdx) => (
                <PlayerGroupCard
                  key={`${player.id}-${expandAll ?? 'default'}`}
                  player={player}
                  pIdx={pIdx}
                  targets={targets}
                  defaultExpanded={expandAll ?? false}
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
            Done / Save Directory
          </button>
        </div>
      </div>
    </div>
  );
}

