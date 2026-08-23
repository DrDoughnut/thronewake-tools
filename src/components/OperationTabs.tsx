import { useState } from 'react';
import type { OperationPlan } from '../engine/operations';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface OperationTabsProps {
  operations: OperationPlan[];
  activeOpId: string | null;
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
  const [deleteConfirmOp, setDeleteConfirmOp] = useState<OperationPlan | null>(null);

  const handleStartRename = (op: OperationPlan) => {
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
    <>
      <div className="op-plans-strip">
        <div className="op-plans-tabs" role="tablist" aria-label="Operations in Room">
          {operations.map((op, idx) => {
            const isActive = op.id === activeOpId;
            const isRenaming = isRenamingId === op.id;
            const activeAtkCount = op.assignedAttackerIds ? op.assignedAttackerIds.length : 0;
            const activeTgtCount = op.assignedTargetIds ? op.assignedTargetIds.length : 0;

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
                onClick={() => (isActive ? onSelectOp('') : onSelectOp(op.id))}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                title={isActive ? 'Click to close/collapse this operation wave' : `Click to open ${op.name}`}
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
                        onClick={() => setDeleteConfirmOp(op)}
                        title="Delete operation"
                      >
                        🗑️
                      </button>
                    )}
                    <button
                      type="button"
                      className="op-plan-tab__btn"
                      onClick={() => onSelectOp('')}
                      title="Close operation wave"
                    >
                      ✕
                    </button>
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

      <ConfirmDeleteModal
        isOpen={deleteConfirmOp !== null}
        title="Delete Operation"
        message="Are you sure you want to delete this operation? All assigned attackers, targets, and scheduled waves for this operation will be removed."
        itemDescription={deleteConfirmOp?.name}
        confirmLabel="Delete Operation"
        onConfirm={() => {
          if (deleteConfirmOp) {
            onDeleteOp(deleteConfirmOp.id);
            setDeleteConfirmOp(null);
          }
        }}
        onCancel={() => setDeleteConfirmOp(null)}
      />
    </>
  );
}
