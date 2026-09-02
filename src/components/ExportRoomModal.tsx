import { useState, useEffect, useMemo } from 'react';
import type { TeamRoomData } from '../engine/operations';
import { createRoomBackup } from '../engine/operations';

interface ExportRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomData: TeamRoomData;
}

export function ExportRoomModal({ isOpen, onClose, roomData }: ExportRoomModalProps) {
  const [copied, setCopied] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const backupJson = useMemo(() => {
    return createRoomBackup(roomData);
  }, [roomData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(backupJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleDownload = () => {
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeRoomName = (roomData.roomName || 'room').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `thronewake-room-${safeRoomName}-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="op-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="op-modal op-modal--export-room"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-room-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="op-modal__header">
          <div>
            <h2 id="export-room-title" className="op-modal__title">
              📤 Export Room Backup
            </h2>
            <p className="op-modal__desc">
              Create a standalone backup of <strong>{roomData.roomName}</strong>. Contains 100% of all master directory hammers, targets, and operations.
            </p>
          </div>
          <button
            type="button"
            className="op-modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="op-export-room-body">
          {/* Summary Stats */}
          <div className="op-export-stats-grid">
            <div className="op-export-stat-card">
              <span className="op-export-stat-icon">🛡️</span>
              <div className="op-export-stat-info">
                <span className="op-export-stat-num">{roomData.roster.attackers.length}</span>
                <span className="op-export-stat-lbl">Master Armies</span>
              </div>
            </div>
            <div className="op-export-stat-card">
              <span className="op-export-stat-icon">🎯</span>
              <div className="op-export-stat-info">
                <span className="op-export-stat-num">{roomData.roster.targets.length}</span>
                <span className="op-export-stat-lbl">{roomData.roster.players.length} Defenders / Villages</span>
              </div>
            </div>
            <div className="op-export-stat-card">
              <span className="op-export-stat-icon">🌊</span>
              <div className="op-export-stat-info">
                <span className="op-export-stat-num">{roomData.operations.length}</span>
                <span className="op-export-stat-lbl">Operation Waves</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="op-export-actions">
            <button
              type="button"
              className="pill pill--primary op-export-btn-download"
              onClick={handleDownload}
            >
              💾 Download Backup (.json)
            </button>
            <button
              type="button"
              className={`pill pill--secondary ${copied ? 'is-copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? '✓ Backup Copied to Clipboard!' : '📋 Copy Backup JSON Code'}
            </button>
          </div>

          {/* Code View Preview */}
          <div className="op-export-code-preview">
            <div className="op-export-code-header">
              <span className="op-export-code-title">Backup JSON Preview</span>
              <span className="op-export-code-meta">{(backupJson.length / 1024).toFixed(1)} KB</span>
            </div>
            <textarea
              className="text-input op-export-textarea"
              readOnly
              rows={6}
              value={backupJson}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
        </div>

        <div className="op-modal__footer">
          <button type="button" className="pill pill--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
