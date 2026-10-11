import { memo, useState } from 'react';
import { parseUtcDatetime, type OperationPlan } from '../engine/operations';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface OperationTabsProps {
  operations: OperationPlan[];
  activeOpId: string | null;
  onSelectOp: (opId: string) => void;
  onCreateOp: (name: string) => void;
  onDuplicateOp: (opId: string) => void;
  onRenameOp: (opId: string, newName: string) => void;
  onDeleteOp: (opId: string) => void;
  /** Opens the "import a shared plan link" flow; the button is hidden without it. */
  onImportPlan?: () => void;
  /** Current time, used to file operations under Upcoming or Past. */
  nowMs?: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "in 2d 4h" for a landing still ahead, "Oct 9" for one that has passed. */
function landingLabel(landingMs: number, nowMs: number): string {
  const diff = landingMs - nowMs;
  if (diff <= 0) {
    const d = new Date(landingMs);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  }
  const mins = Math.max(1, Math.round(diff / 60_000));
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  return `in ${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export const OperationTabs = memo(function OperationTabs({
  operations,
  activeOpId,
  onSelectOp,
  onCreateOp,
  onDuplicateOp,
  onRenameOp,
  onDeleteOp,
  onImportPlan,
  nowMs = Date.now(),
}: OperationTabsProps) {
  const [isRenamingId, setIsRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newOpName, setNewOpName] = useState('');
  const [deleteConfirmOp, setDeleteConfirmOp] = useState<OperationPlan | null>(null);
  const [isPastOpen, setIsPastOpen] = useState(false);

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

  // Filed by landing time rather than by a tag typed into the name: an
  // operation moves to Past on its own once it has landed.
  const landingMsOf = (op: OperationPlan) => parseUtcDatetime(op.landing)?.getTime() ?? null;
  const isPast = (op: OperationPlan) => {
    const ms = landingMsOf(op);
    return ms !== null && ms <= nowMs;
  };
  const upcomingOps = operations
    .filter((o) => !isPast(o))
    .sort((a, b) => (landingMsOf(a) ?? Infinity) - (landingMsOf(b) ?? Infinity));
  const pastOps = operations
    .filter(isPast)
    .sort((a, b) => (landingMsOf(b) ?? 0) - (landingMsOf(a) ?? 0));
  const isActivePast = pastOps.some((o) => o.id === activeOpId);

  const renderOpTab = (op: OperationPlan) => {
    const isActive = op.id === activeOpId;
    const isRenaming = isRenamingId === op.id;
    const isReady = op.status === 'ready';
    const landingMs = landingMsOf(op);

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
            : `Click to open ${op.name} (${isReady ? 'Ready' : 'Draft'}) · lands ${op.landing.replace('T', ' ')} UTC`
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
          {landingMs !== null && (
            <span className="op-plan-tab__when">{landingLabel(landingMs, nowMs)}</span>
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
          </div>
          <div className="op-plans-strip__actions">
            {onImportPlan && (
              <button
                type="button"
                className="pill pill--tiny pill--secondary op-plans-import-btn"
                onClick={onImportPlan}
                title="Open a plan link someone shared as a new operation"
              >
                🔗 Import Link
              </button>
            )}
            <button
              type="button"
              className="pill pill--tiny pill--primary"
              onClick={() => setIsCreating(true)}
              title="Create a new draft operation"
            >
              + New Operation
            </button>
          </div>
        </div>

        <div className="op-plans-strip">
          <div className="op-plans-group op-plans-group--upcoming" role="tablist" aria-label="Upcoming operations">
            <span className="op-plans-group__label">Upcoming</span>
            {upcomingOps.map(renderOpTab)}
            {upcomingOps.length === 0 && !isCreating && (
              <span className="op-plans-empty-hint">Nothing scheduled</span>
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

          {/* Landed operations stay out of the way until asked for */}
          {pastOps.length > 0 && (
            <details
              className="op-plans-past"
              open={isPastOpen || isActivePast}
              onToggle={(e) => setIsPastOpen(e.currentTarget.open)}
            >
              <summary className="op-plans-past__summary">
                <span className="op-plans-group__label op-plans-group__label--past">Past</span>
                <span className="op-plans-past__count">
                  {pastOps.length} landed {pastOps.length === 1 ? 'operation' : 'operations'}
                </span>
              </summary>
              <div className="op-plans-group op-plans-group--past" role="tablist" aria-label="Past operations">
                {pastOps.map(renderOpTab)}
              </div>
            </details>
          )}
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
