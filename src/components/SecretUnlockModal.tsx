import { useState, useEffect } from 'react';

interface SecretUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectRoom: (passcode: string) => void;
}

function playUnlockAudio() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // High tech multi-tone chime sweep
    const notes = [
      { freq: 440, time: 0, dur: 0.12 },
      { freq: 659.25, time: 0.1, dur: 0.12 },
      { freq: 880, time: 0.2, dur: 0.15 },
      { freq: 1318.51, time: 0.32, dur: 0.35 },
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
      gain.gain.setValueAtTime(0, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur + 0.05);
    });
  } catch {}
}

export function SecretUnlockModal({ isOpen, onClose, onConnectRoom }: SecretUnlockModalProps) {
  const [passcode, setPasscode] = useState('');

  useEffect(() => {
    if (isOpen) {
      playUnlockAudio();
      try {
        const saved = localStorage.getItem('thronewake.teamroom.session') || '';
        if (saved) setPasscode(saved);
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim();
    if (clean) {
      onConnectRoom(clean);
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <div className="secret-modal-backdrop" onClick={onClose}>
      <div
        className="secret-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="secret-modal-title"
      >
        <div className="secret-modal-scanner" aria-hidden="true" />

        <div className="secret-modal-header">
          <div className="secret-modal-badge">
            <span className="secret-modal-dot" />
            <span>CLASSIFIED PROTOCOL // LEVEL 5 CLEARANCE</span>
          </div>
          <button
            type="button"
            className="secret-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="secret-modal-body">
          <div className="secret-modal-icon-wrap">
            <div className="secret-modal-radar">
              <span className="secret-modal-radar-beam" />
              <span className="secret-modal-lock-icon">🕵️</span>
            </div>
          </div>

          <h2 id="secret-modal-title" className="secret-modal-title">
            Top Secret Planner v2 Unlocked
          </h2>

          <p className="secret-modal-desc">
            Enter or create a secret Team Room passcode to access Multi-Wave Management, Alliance Master Roster, and Zero-Knowledge Cloud Synchronization.
          </p>

          <form className="secret-modal-form" onSubmit={handleSubmit}>
            <div className="secret-modal-field">
              <label htmlFor="secret-room-passcode" className="secret-modal-label">
                <span>Enter Secret Team Room Passcode:</span>
                <span className="secret-modal-crypto-tag">AES-256-GCM Encrypted</span>
              </label>
              <input
                id="secret-room-passcode"
                type="text"
                className="text-input secret-modal-input"
                placeholder="e.g. password123"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              <span className="secret-modal-hint">
                Anyone in your alliance with this exact secret code can collaborate on the same operations live without an account.
              </span>
            </div>

            <div className="secret-modal-actions">
              <button
                type="submit"
                className="pill pill--primary secret-modal-btn-connect"
                disabled={!passcode.trim()}
              >
                🔐 Connect to Room
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
