import { memo, useState } from 'react';
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

export const OperationTabs = memo(function OperationTabs({
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

  const readyOps = operations.filter((o) => o.status === 'ready');
  const draftOps = operations.filter((o) => o.status !== 'ready');

  const renderOpTab = (op: OperationPlan) => {
    const isActive = op.id === activeOpId;
    const isRenaming = isRenamingId === op.id;
    const isReady = op.status === 'ready';

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
        className={`op-plan-tab ${isActive ? 'is-active' : ''} ${isReady ? 'is-ready' : 'is-draft'}`}
        onClick={() => (isActive ? onSelectOp('') : onSelectOp(op.id))}
        role="tab"
        aria-selected={isActive}
        tabIndex={0}
        title={
          isActive
            ? 'Click to close this operation wave'
            : `Click to open ${op.name} (${isReady ? 'Confirmed / Ready' : 'Draft'})`
        }
      >
        <div className="op-plan-tab__content">
          <strong
            className="op-plan-tab__name"
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleStartRename(op);
            }}
            title="Double-click to rename"
          >
            {op.name}
          </strong>
          {isReady && (
            <span
              className="op-tab-status-badge op-tab-status-badge--ready"
              title="Confirmed / Ready: Protected against accidental edits"
            >
              Ready
            </span>
          )}
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
  };

  return (
    <>
      <section className="panel op-plans-strip-panel" aria-label="Operations Section">
        <div className="op-plans-strip__header">
          <div className="op-plans-strip__title-wrap">
            <h2 className="op-section-title">Operations</h2>
            <span className="op-plans-strip__subtitle">
              <span><strong>{readyOps.length}</strong> Ready · </span>
              <span><strong>{draftOps.length}</strong> Draft{draftOps.length === 1 ? '' : 's'}</span>
              <span> ({operations.length} total)</span>
            </span>
          </div>
          <button
            type="button"
            className="pill pill--tiny pill--primary"
            onClick={() => setIsCreating(true)}
            title="Create a new draft operation"
          >
            + New Operation
          </button>
        </div>

        <div className="op-plans-strip">
          {/* Ready operations row - always shown */}
          <div className="op-plans-group op-plans-group--ready" role="tablist" aria-label="Ready operations">
            <span className="op-plans-group__label">Ready</span>
            {readyOps.length > 0 ? (
              readyOps.map(renderOpTab)
            ) : (
              <span className="op-plans-empty-hint">None</span>
            )}
          </div>

          {/* Horizontal divider between Ready and Drafts - always shown */}
          <div
            className="op-plans-divider op-plans-divider--horizontal"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Divider between Ready and Draft operations"
          />

          {/* Draft operations row - always shown */}
          <div className="op-plans-group op-plans-group--draft" role="tablist" aria-label="Draft operations">
            <span className="op-plans-group__label op-plans-group__label--draft">Drafts</span>
            {draftOps.length > 0 ? (
              draftOps.map(renderOpTab)
            ) : (
              <span className="op-plans-empty-hint">None</span>
            )}

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
            ) : null}
          </div>
        </div>
      </section>

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
});
