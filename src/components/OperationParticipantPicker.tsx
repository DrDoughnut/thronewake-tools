import { useState } from 'react';
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
  const [isEditing, setIsEditing] = useState(false);
  const activeAttackerCount = assignedAttackerIds.length;
  const totalAttackerCount = attackers.length;

  const activeTargetCount = assignedTargetIds.length;
  const totalTargetCount = targets.length;

  return (
    <section className="panel op-participant-picker">
      <div className="op-participant-picker__summary">
        <div className="op-participant-picker__summary-copy">
          <span className="op-participant-picker__eyebrow">Participants</span>
          <strong>{activeAttackerCount} of {totalAttackerCount} armies · {activeTargetCount} of {totalTargetCount} targets</strong>
          <span>Choose who marches and mark real or fake hits for this operation.</span>
        </div>
        <button
          type="button"
          className="pill pill--primary"
          onClick={() => setIsEditing((current) => !current)}
          aria-expanded={isEditing}
        >
          {isEditing ? "Done" : "Edit Participants"}
        </button>
      </div>

      {isEditing && (
        <div className="op-participant-picker__grid">
        {/* Left Column: Marching Armies */}
        <div className="op-participant-col op-participant-col--attackers">
          <div className="op-participant-col__header">
            <div className="op-participant-col__title-wrap">
              <span className="op-participant-col__tag op-participant-col__tag--attacker">Attackers</span>
              <h3 className="op-participant-col__title">
                Marching Armies ({activeAttackerCount}/{totalAttackerCount})
              </h3>
            </div>
            <div className="op-participant-col__actions">
              <button
                type="button"
                className="pill pill--tiny"
                onClick={onSelectAllAttackers}
                title="Select all alliance armies for this operation"
              >
                ✓ All
              </button>
              <button
                type="button"
                className="pill pill--tiny"
                onClick={onDeselectAllAttackers}
                title="Clear all armies from this operation"
              >
                ⏸ None
              </button>
              <button
                type="button"
                className="pill pill--tiny pill--primary"
                onClick={onOpenAttackerModal}
                title="Add or edit armies in master roster"
              >
                👥 Edit Roster
              </button>
            </div>
          </div>

          <div className="op-participant-chips">
            {attackers.length === 0 ? (
              <div className="op-participant-chips__empty">
                No armies in roster.{' '}
                <button type="button" className="btn-link" onClick={onOpenAttackerModal}>
                  + Add armies
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

        {/* Right Column: Target Villages */}
        <div className="op-participant-col op-participant-col--targets">
          <div className="op-participant-col__header">
            <div className="op-participant-col__title-wrap">
              <span className="op-participant-col__tag op-participant-col__tag--target">Targets</span>
              <h3 className="op-participant-col__title">
                Target Villages ({activeTargetCount}/{totalTargetCount})
              </h3>
            </div>
            <div className="op-participant-col__actions">
              <button
                type="button"
                className="pill pill--tiny"
                onClick={onSelectAllTargets}
                title="Select all targets for this operation"
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
                title="Add or edit defender accounts and villages"
              >
                🎯 Edit Targets
              </button>
            </div>
          </div>

          <div className="op-participant-chips">
            {targets.length === 0 ? (
              <div className="op-participant-chips__empty">
                No targets in database.{' '}
                <button type="button" className="btn-link" onClick={onOpenTargetModal}>
                  + Add targets
                </button>
              </div>
            ) : (
              targets.map((tgt) => {
                const isSelected = assignedTargetIds.includes(tgt.id);
                const isFake = fakeTargetIds.includes(tgt.id);
                const owner = players.find((p) => p.id === tgt.playerId);

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
                      <span className="op-participant-chip__name">{tgt.name || 'Target'}</span>
                      {owner && <span className="op-participant-chip__owner">[{owner.name}]</span>}
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
              })
            )}
          </div>
        </div>
        </div>
      )}
    </section>
  );
}
