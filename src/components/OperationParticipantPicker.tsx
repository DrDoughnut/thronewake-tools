import { useMemo } from 'react';
import type { Attacker, Player, SafeWindow, Target } from '../engine/operations';
import { extractLegacyTags, isInSafeWindow, parseClock } from '../engine/operations';
import { lookup, type UnitRef } from '../data/factions';
import { UnitGridPicker } from './UnitGridPicker';

interface OperationParticipantPickerProps {
  attackerWarnings?: Record<string, string>;
  targetWarnings?: Record<string, string>;
  attackers: Attacker[];
  attackerPlayers?: Player[];
  players: Player[];
  targets: Target[];
  assignedAttackerIds: string[];
  assignedTargetIds: string[];
  fakeTargetIds: string[];
  attackerUnitOverrides?: Record<string, string>;
  parsedLanding?: Date | null;
  onToggleAttacker: (attackerId: string) => void;
  onToggleTarget: (targetId: string) => void;
  onToggleTargetFake: (targetId: string) => void;
  onUpdateAttackerUnit?: (attackerId: string, unitRef: string) => void;
  onSelectAllAttackers: () => void;
  onDeselectAllAttackers: () => void;
  onSelectAllTargets: () => void;
  onDeselectAllTargets: () => void;
  onOpenAttackerModal: () => void;
  onOpenTargetModal: () => void;
}

export function OperationParticipantPicker({
  attackerWarnings = {},
  targetWarnings = {},
  attackers,
  attackerPlayers = [],
  players,
  targets,
  assignedAttackerIds,
  assignedTargetIds,
  fakeTargetIds,
  attackerUnitOverrides = {},
  parsedLanding,
  onToggleAttacker,
  onToggleTarget,
  onToggleTargetFake,
  onUpdateAttackerUnit,
  onSelectAllAttackers,
  onDeselectAllAttackers,
  onSelectAllTargets,
  onDeselectAllTargets,
  onOpenAttackerModal,
  onOpenTargetModal,
}: OperationParticipantPickerProps) {
  const activeAttackerCount = assignedAttackerIds.length;
  const totalAttackerCount = attackers.length;

  const activeTargetCount = assignedTargetIds.length;
  const totalTargetCount = targets.length;

  const isOwnerBlocked = (owner: { safeEnabled: boolean; safeStart: string; safeEnd: string } | null | undefined): boolean => {
    if (!owner || !owner.safeEnabled || !parsedLanding) return false;
    const win: SafeWindow = {
      enabled: owner.safeEnabled,
      start: parseClock(owner.safeStart),
      end: parseClock(owner.safeEnd),
    };
    return isInSafeWindow(parsedLanding, win);
  };

  // Group attackers by alliance member, sorted by member name
  const attackerPlayerGroups = useMemo(() => {
    if (!attackerPlayers || attackerPlayers.length === 0) {
      return [{ player: null, attackers }];
    }

    const groups: { player: Player | null; attackers: Attacker[] }[] = [];

    attackerPlayers.forEach((p) => {
      const pAttackers = attackers.filter((a) => a.playerId === p.id);
      if (pAttackers.length > 0) {
        groups.push({ player: p, attackers: pAttackers });
      }
    });

    const unassigned = attackers.filter(
      (a) => !a.playerId || !attackerPlayers.some((p) => p.id === a.playerId),
    );
    if (unassigned.length > 0) {
      groups.push({ player: null, attackers: unassigned });
    }

    return groups;
  }, [attackerPlayers, attackers]);

  // Group targets by player, sorted with unblocked accounts first, blocked accounts at the bottom
  const playerGroups = useMemo(() => {
    const groups: { player: Player | null; targets: Target[]; isBlocked: boolean }[] = [];

    players.forEach((p) => {
      const pTargets = targets.filter((t) => t.playerId === p.id);
      if (pTargets.length > 0) {
        const isBlocked = isOwnerBlocked(p);
        groups.push({ player: p, targets: pTargets, isBlocked });
      }
    });

    const unassigned = targets.filter((t) => !t.playerId || !players.some((p) => p.id === t.playerId));
    if (unassigned.length > 0) {
      const anyBlocked = unassigned.some((t) => isOwnerBlocked(t));
      groups.push({ player: null, targets: unassigned, isBlocked: anyBlocked });
    }

    // Sort: unblocked defenders first, blocked defenders at the bottom
    groups.sort((a, b) => {
      if (a.isBlocked === b.isBlocked) return 0;
      return a.isBlocked ? 1 : -1;
    });

    return groups;
  }, [players, targets, parsedLanding]);

  return (
    <section className="panel op-participant-picker" aria-label="Operation Participants">
      <div className="op-participant-picker__summary">
        <div className="op-participant-picker__summary-copy">
          <span className="op-participant-picker__eyebrow">Wave Deployment</span>
          <strong>
            {activeAttackerCount} of {totalAttackerCount} armies deployed · {activeTargetCount} of {totalTargetCount} targets assigned
          </strong>
          <span>Select which registered alliance armies march and which enemy villages are targeted for this operation wave. Set troop speeds for this wave without modifying the master directory.</span>
        </div>
      </div>

      <div className="op-participant-picker__grid">
        {/* Left Column: Marching Armies */}
        <div className="op-participant-col op-participant-col--attackers">
          <div className="op-participant-col__header">
            <div className="op-participant-col__title-wrap">
              <span className="op-participant-col__tag op-participant-col__tag--attacker">Marching</span>
              <h3 className="op-participant-col__title">
                Deployed Armies ({activeAttackerCount}/{totalAttackerCount})
              </h3>
            </div>
            <div className="op-participant-col__actions">
              <button
                type="button"
                className="pill pill--tiny"
                onClick={onSelectAllAttackers}
                title="Deploy all registered alliance armies for this operation"
              >
                ✓ All
              </button>
              <button
                type="button"
                className="pill pill--tiny"
                onClick={onDeselectAllAttackers}
                title="Bench all armies for this operation"
              >
                ⏸ None
              </button>
              <button
                type="button"
                className="pill pill--tiny pill--primary"
                onClick={onOpenAttackerModal}
                title="Open Master Alliance Hammer Directory to add or edit armies"
              >
                👥 Master Directory
              </button>
            </div>
          </div>

          {attackers.length === 0 ? (
            <div className="op-participant-chips__empty">
              No armies registered in master directory.{' '}
              <button type="button" className="btn-link" onClick={onOpenAttackerModal}>
                + Register armies
              </button>
            </div>
          ) : (
            <div className="op-participant-players-list">
              {attackerPlayerGroups.map((group, gIdx) => (
                <div
                  key={group.player?.id || `unassigned-${gIdx}`}
                  className="op-participant-player-block"
                >
                  <div className="op-participant-player-header op-participant-player-header--attacker">
                    <span>Member: <strong>{group.player ? group.player.name : 'Alliance Member'}</strong></span>
                    {group.player && (
                      <span className={`op-safetime__tag ${group.player.safeEnabled ? 'is-enabled' : ''}`}>
                        {group.player.safeEnabled
                          ? `🛡️ ${group.player.safeStart}–${group.player.safeEnd} UTC`
                          : '🛡️ Safe: Off'}
                      </span>
                    )}
                  </div>

                  <div className="op-participant-chips op-participant-chips--vertical">
                    {group.attackers.map((atk) => {
                      const isSelected = assignedAttackerIds.includes(atk.id);
                      const currentUnitRef = (attackerUnitOverrides[atk.id] || atk.unitRef) as UnitRef;
                      const unitInfo = lookup(currentUnitRef);

                      return (
                        <div
                          key={atk.id}
                          className={`op-participant-row ${isSelected ? 'is-selected' : ''}`}
                        >
                          <label
                            className={`op-participant-chip op-participant-chip--attacker ${isSelected ? 'is-selected' : ''}`}
                            title={isSelected ? 'Deployed in this operation wave (Click to bench)' : 'Benched in reserve (Click to deploy)'}
                          >
                            {attackerWarnings[atk.id] && <span className="op-participant-warning" role="img" aria-label={`Blocked routes for ${atk.name}: ${attackerWarnings[atk.id]}`} title={attackerWarnings[atk.id]}>⚠️</span>}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleAttacker(atk.id)}
                            />
                            <span className="op-participant-chip__check" aria-hidden="true">
                              {isSelected ? '✓' : ''}
                            </span>
                            <span className="op-participant-chip__name">{atk.name || 'Attacker'}</span>
                            <span className="op-participant-chip__meta">
                              ({atk.x}|{atk.y})
                            </span>
                          </label>

                          {isSelected && (
                            <div className="op-wave-troop-picker" title={`Slowest troop for this wave: ${unitInfo.unit.name} (${unitInfo.unit.speed} fields/h)`}>
                              <UnitGridPicker
                                unitRef={currentUnitRef}
                                onChange={(newRef) => onUpdateAttackerUnit?.(atk.id, newRef)}
                                compact={true}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Target Villages Sorted by Defender */}
        <div className="op-participant-col op-participant-col--targets">
          <div className="op-participant-col__header">
            <div className="op-participant-col__title-wrap">
              <span className="op-participant-col__tag op-participant-col__tag--target">Targeted</span>
              <h3 className="op-participant-col__title">
                Targeted Villages ({activeTargetCount}/{totalTargetCount})
              </h3>
            </div>
            <div className="op-participant-col__actions">
              <button
                type="button"
                className="pill pill--tiny"
                onClick={onSelectAllTargets}
                title="Assign all registered targets to this operation"
              >
                ✓ All
              </button>
              <button
                type="button"
                className="pill pill--tiny"
                onClick={onDeselectAllTargets}
                title="Clear all targets from this operation"
              >
                ⏸ None
              </button>
              <button
                type="button"
                className="pill pill--tiny pill--primary"
                onClick={onOpenTargetModal}
                title="Open Master Enemy Target Directory to add or edit defenders"
              >
                🎯 Master Directory
              </button>
            </div>
          </div>

          {targets.length === 0 ? (
            <div className="op-participant-chips__empty">
              No targets found.{' '}
              <button type="button" className="btn-link" onClick={onOpenTargetModal}>
                + Add targets
              </button>
            </div>
          ) : (
            <div className="op-participant-players-list">
              {playerGroups.map((group, idx) => {
                const isGroupBlocked = group.isBlocked;
                return (
                  <div
                    key={group.player?.id || `unassigned-${idx}`}
                    className={`op-participant-player-block ${isGroupBlocked ? 'is-blocked-defender' : ''}`}
                  >
                    <div className="op-participant-player-header">
                      <span>Defender: <strong>{group.player ? group.player.name : 'Unassigned Account'}</strong></span>
                      {group.player && (
                        <span
                          className={`op-safetime__tag ${group.player.safeEnabled ? 'is-enabled' : ''} ${isGroupBlocked ? 'is-safetime-danger' : ''}`}
                        >
                          {group.player.safeEnabled
                            ? (isGroupBlocked
                                ? `🛡️ Landing in Safetime (${group.player.safeStart}–${group.player.safeEnd} UTC) · Blocked`
                                : `🛡️ ${group.player.safeStart}–${group.player.safeEnd} UTC`)
                            : '🛡️ Safe: Off'}
                        </span>
                      )}
                    </div>

                    <div className="op-participant-chips op-participant-chips--vertical">
                      {group.targets.map((rawTgt) => {
                        const tgt = extractLegacyTags(rawTgt);
                        const isSelected = assignedTargetIds.includes(tgt.id);
                        const isFake = fakeTargetIds.includes(tgt.id);
                        const isTargetBlocked = !group.player ? isOwnerBlocked(tgt) : isGroupBlocked;

                        return (
                          <div key={tgt.id} className="op-target-assignment">
                            <label
                              className={`op-participant-chip op-participant-chip--target ${isSelected ? 'is-selected' : ''} ${isFake ? 'is-fake' : ''}`}
                            >
                              {targetWarnings[tgt.id] && <span className="op-participant-warning" role="img" aria-label={`Blocked routes for ${tgt.name}: ${targetWarnings[tgt.id]}`} title={targetWarnings[tgt.id]}>⚠️</span>}
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onToggleTarget(tgt.id)}
                              />
                              <span className="op-participant-chip__check" aria-hidden="true">
                                {isSelected ? '✓' : ''}
                              </span>
                              <span className="op-participant-chip__name">{tgt.name || 'Village'}</span>
                              <span className="op-participant-chip__meta">({tgt.x}|{tgt.y})</span>
                              {tgt.isCapital && <span className="op-badge-tag op-badge-tag--cap">👑 Cap</span>}
                              {tgt.isCity && <span className="op-badge-tag op-badge-tag--city">🏛️ City</span>}
                              {tgt.artifactName && (
                                <span className="op-badge-tag op-badge-tag--art" title={`Artifact: ${tgt.artifactName}`}>
                                  🏺 {tgt.artifactName}
                                </span>
                              )}
                              {!group.player && tgt.safeEnabled && (
                                <span
                                  className={`op-safetime__tag is-enabled op-safetime__tag--mini ${isTargetBlocked ? 'is-safetime-danger' : ''}`}
                                >
                                  🛡️ {tgt.safeStart}–{tgt.safeEnd} {isTargetBlocked ? '· Blocked' : ''}
                                </span>
                              )}
                            </label>
                          {isSelected && (
                            <button
                              type="button"
                              className={`pill pill--tiny op-target-mode ${isFake ? 'is-fake' : 'is-real'}`}
                              onClick={() => onToggleTargetFake(tgt.id)}
                              aria-pressed={isFake}
                              title="Attack type for this operation only"
                            >
                              {isFake ? 'Fake' : 'Real'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
