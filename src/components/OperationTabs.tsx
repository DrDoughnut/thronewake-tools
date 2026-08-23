import { useState } from 'react';
import type { TeamOperation } from '../engine/operations';

interface OperationTabsProps {
  operations: TeamOperation[];
  activeOpId: string;
  onSelectOp: (opId: string) => void;
  onCreateOp: (name: string) => void;
  onDuplicateOp: (opId: string) => void;
  onRenameOp: (opId: string, newName: string) => void;
  onDeleteOp: (opId: string) => void;
}

export function OperationTabs({
  operations,
  activeOpId,
  onSelectOp,
  onCreateOp,
  onDuplicateOp,
  onRenameOp,
  onDeleteOp,
}: OperationTabsProps) {
  const [isRenamingId, setIsRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newOpName, setNewOpName] = useState('');

  const handleStartRename = (op: TeamOperation) => {
    setIsRenamingId(op.id);
    setRenameValue(op.name);
  };

  const handleCommitRename = (opId: string) => {
    if (renameValue.trim()) {
      onRenameOp(opId, renameValue.trim());
    }
    setIsRenamingId(null);
  };

  const handleCommitCreate = () => {
    const name = newOpName.trim() || `Operation ${operations.length + 1}`;
    onCreateOp(name);
    setNewOpName('');
    setIsCreating(false);
  };

  return (
    <div className="op-plans-strip">
      <div className="op-plans-tabs" role="tablist" aria-label="Operations in Room">
        {operations.map((op, idx) => {
          const isActive = op.id === activeOpId;
          const isRenaming = isRenamingId === op.id;
          const activeAtkCount = op.attackers.filter((a) => a.active !== false).length;
          const activeTgtCount = op.targets.filter((t) => t.active !== false).length;

          if (isRenaming) {
            return (
              <div key={op.id} className="op-plan-tab is-renaming">
                <input
                  type="text"
                  className="text-input op-plan-rename-input"
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommitRename(op.id);
                    if (e.key === 'Escape') setIsRenamingId(null);
                  }}
                  onBlur={() => handleCommitRename(op.id)}
                />
              </div>
            );
          }

          return (
            <div
              key={op.id}
              className={`op-plan-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectOp(op.id)}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
            >
              <div className="op-plan-tab__content">
                <span className="op-plan-tab__idx">#{idx + 1}</span>
                <strong className="op-plan-tab__name">{op.name}</strong>
                <span className="op-plan-tab__badge">
                  {activeAtkCount} atk × {activeTgtCount} tgt
                </span>
              </div>

              {isActive && (
                <div className="op-plan-tab__menu" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="op-plan-tab__btn"
                    onClick={() => handleStartRename(op)}
                    title="Rename operation"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="op-plan-tab__btn"
                    onClick={() => onDuplicateOp(op.id)}
                    title="Duplicate operation"
                  >
                    📑
                  </button>
                  {operations.length > 1 && (
                    <button
                      type="button"
                      className="op-plan-tab__btn op-plan-tab__btn--danger"
                      onClick={() => onDeleteOp(op.id)}
                      title="Delete operation"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isCreating ? (
          <div className="op-plan-tab is-creating">
            <input
              type="text"
              className="text-input op-plan-rename-input"
              placeholder="Operation name..."
              value={newOpName}
              autoFocus
              onChange={(e) => setNewOpName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitCreate();
                if (e.key === 'Escape') setIsCreating(false);
              }}
              onBlur={handleCommitCreate}
            />
          </div>
        ) : (
          <button
            type="button"
            className="op-plan-tab-add"
            onClick={() => setIsCreating(true)}
            title="Create a new operation"
          >
            + New Operation
          </button>
        )}
      </div>
    </div>
  );
}
