import { useMemo } from 'react';
import type { Attacker, Player, Target } from '../engine/operations';

interface OperationParticipantPickerProps {
  attackers: Attacker[];
  players: Player[];
  targets: Target[];
  assignedAttackerIds: string[];
  assignedTargetIds: string[];
  fakeTargetIds: string[];
  onToggleAttacker: (attackerId: string) => void;
  onToggleTarget: (targetId: string) => void;
  onToggleTargetFake: (targetId: string) => void;
  onSelectAllAttackers: () => void;
  onDeselectAllAttackers: () => void;
  onSelectAllTargets: () => void;
  onDeselectAllTargets: () => void;
  onOpenAttackerModal: () => void;
  onOpenTargetModal: () => void;
}

export function OperationParticipantPicker({
  attackers,
  players,
  targets,
  assignedAttackerIds,
  assignedTargetIds,
  fakeTargetIds,
  onToggleAttacker,
  onToggleTarget,
  onToggleTargetFake,
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
          <span>Select which registered alliance armies march and which enemy villages are targeted for this operation wave. Unchecked armies stay benched in reserve.</span>
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
              attackers.map((atk) => {
                const isSelected = assignedAttackerIds.includes(atk.id);
                const troopName = atk.unitRef.split('/')[1]?.replace(/_/g, ' ') || 'Troop';

                return (
                  <label
                    key={atk.id}
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
                      ({troopName} · {atk.x}|{atk.y})
                    </span>
                  </label>
                );
              })
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
