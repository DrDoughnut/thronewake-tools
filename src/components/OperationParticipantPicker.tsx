import { useMemo } from 'react';
import type { Attacker, Player, Target } from '../engine/operations';
import { lookup, type UnitRef } from '../data/factions';
import { UnitGridPicker } from './UnitGridPicker';

interface OperationParticipantPickerProps {
  attackers: Attacker[];
  attackerPlayers?: Player[];
  players: Player[];
  targets: Target[];
  assignedAttackerIds: string[];
  assignedTargetIds: string[];
  fakeTargetIds: string[];
  attackerUnitOverrides?: Record<string, string>;
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
  attackers,
  attackerPlayers = [],
  players,
  targets,
  assignedAttackerIds,
  assignedTargetIds,
  fakeTargetIds,
  attackerUnitOverrides = {},
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

  // Group targets by player, sorted by player name
  const playerGroups = useMemo(() => {
    const groups: { player: Player | null; targets: Target[] }[] = [];

    players.forEach((p) => {
      const pTargets = targets.filter((t) => t.playerId === p.id);
      if (pTargets.length > 0) {
        groups.push({ player: p, targets: pTargets });
      }
    });

    const unassigned = targets.filter((t) => !t.playerId || !players.some((p) => p.id === t.playerId));
    if (unassigned.length > 0) {
      groups.push({ player: null, targets: unassigned });
    }

    return groups;
  }, [players, targets]);

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

          <div className="op-participant-chips op-participant-chips--vertical">
            {attackers.length === 0 ? (
              <div className="op-participant-chips__empty">
                No armies registered in master directory.{' '}
                <button type="button" className="btn-link" onClick={onOpenAttackerModal}>
                  + Register armies
                </button>
              </div>
            ) : (
              attackerPlayerGroups.map((group, gIdx) => (
                <div
                  className="op-participant-group"
                  key={group.player ? group.player.id : `unassigned_${gIdx}`}
                >
                  {group.player && (
                    <div className="op-participant-group-header">
                      <span>👤 {group.player.name || 'Member'}</span>
                      <span className="op-participant-group-count">
                        ({group.attackers.filter((a) => assignedAttackerIds.includes(a.id)).length}/
                        {group.attackers.length} deployed)
                      </span>
                    </div>
                  )}

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
              ))
            )}
          </div>
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
              {playerGroups.map((group, idx) => (
                <div key={group.player?.id || `unassigned-${idx}`} className="op-participant-player-block">
                  <div className="op-participant-player-header">
                    <span>Defender: <strong>{group.player ? group.player.name : 'Unassigned Account'}</strong></span>
                  </div>

                  <div className="op-participant-chips op-participant-chips--vertical">
                    {group.targets.map((tgt) => {
                      const isSelected = assignedTargetIds.includes(tgt.id);
                      const isFake = fakeTargetIds.includes(tgt.id);

                      return (
                        <div key={tgt.id} className="op-target-assignment">
                          <label
                            className={`op-participant-chip op-participant-chip--target ${isSelected ? 'is-selected' : ''} ${isFake ? 'is-fake' : ''}`}
                          >
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
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
