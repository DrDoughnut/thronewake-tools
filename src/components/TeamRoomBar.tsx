import { useState, useEffect, useCallback, useRef } from 'react';
import {
  deriveRoomSession,
  encryptPayload,
  decryptPayload,
  saveToCloud,
  loadFromCloud,
  type RoomCryptoSession,
} from '../engine/cryptoSync';
import type { TeamRoomData } from '../engine/operations';

const ROOM_STORAGE_KEY = 'thronewake.teamroom.session';
const AUTOSAVE_STORAGE_KEY = 'thronewake.teamroom.autosave';

interface TeamRoomBarProps {
  hasUnsavedChanges?: boolean;
  serverSpeed?: number;
  onServerSpeedChange?: (speed: number) => void;
  onRoomDataLoaded: (data: TeamRoomData, session: RoomCryptoSession) => void;
  onRoomDisconnected: () => void;
  onSaveRequested: () => Promise<TeamRoomData>;
}

export function TeamRoomBar({
  hasUnsavedChanges = false,
  serverSpeed = 3,
  onServerSpeedChange,
  onRoomDataLoaded,
  onRoomDisconnected,
  onSaveRequested,
}: TeamRoomBarProps) {
  const [passcode, setPasscode] = useState<string>(() => {
    try {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const hashRoom = hashParams.get('room');
      const saved = localStorage.getItem(ROOM_STORAGE_KEY);
      return hashRoom || saved || '';
    } catch {
      return '';
    }
  });
  const [session, setSession] = useState<RoomCryptoSession | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'saving' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [autoSave, setAutoSave] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTOSAVE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  const saveInProgressRef = useRef(false);
  const isConnectingRef = useRef(false);
  const hasAutoConnectedRef = useRef(false);

  const onRoomDataLoadedRef = useRef(onRoomDataLoaded);
  const onRoomDisconnectedRef = useRef(onRoomDisconnected);
  const onSaveRequestedRef = useRef(onSaveRequested);

  useEffect(() => {
    onRoomDataLoadedRef.current = onRoomDataLoaded;
    onRoomDisconnectedRef.current = onRoomDisconnected;
    onSaveRequestedRef.current = onSaveRequested;
  });

  const toggleAutoSave = () => {
    setAutoSave((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  const handleConnect = useCallback(
    async (codeToUse?: string) => {
      if (isConnectingRef.current) return;
      const code = (codeToUse || passcode).trim();
      if (!code || code.length < 2) {
        setStatus('error');
        setStatusMsg('Please enter a room code (at least 2 characters)');
        return;
      }

      isConnectingRef.current = true;
      setStatus('connecting');
      setStatusMsg('Deriving Zero-Knowledge encryption keys...');

      try {
        const sess = await deriveRoomSession(code);
        if (!sess) {
          setStatus('error');
          setStatusMsg('Failed to derive encryption session');
          return;
        }

        setStatusMsg('Connecting to room...');
        const cloudRes = await loadFromCloud(sess.roomId);

        let loadedData: TeamRoomData | null = null;

        if (cloudRes.success && cloudRes.data) {
          // Decrypt existing room payload
          loadedData = await decryptPayload<TeamRoomData>(cloudRes.data, sess.cryptoKey);
          if (!loadedData) {
            setStatus('error');
            setStatusMsg('Decryption failed: Room payload was modified or corrupted.');
            return;
          }
        } else {
          // If cloud returned no data or failed, check offline cache
          try {
            const cachedCipher = localStorage.getItem(`thronewake.room_cache.${sess.roomId}`);
            if (cachedCipher) {
              loadedData = await decryptPayload<TeamRoomData>(cachedCipher, sess.cryptoKey);
            }
          } catch {}

          if (!loadedData) {
            // New Room initialized clean
            const cleanPlan: TeamRoomData = {
              version: 2,
              roomName: sess.roomName,
              activeOpId: null,
              roster: {
                attackers: [
                  {
                    id: 'a1',
                    name: 'Attacker 1',
                    x: 0,
                    y: 0,
                    unitRef: 'embermark_dominion/emberblade',
                    artifactMultiplier: 1,
                    bannerfieldLevel: 0,
                    safeEnabled: false,
                    safeStart: '22:00',
                    safeEnd: '04:00',
                  },
                ],
                players: [
                  {
                    id: 'p1',
                    name: 'Defender 1',
                    safeEnabled: false,
                    safeStart: '22:00',
                    safeEnd: '04:00',
                  },
                ],
                targets: [
                  {
                    id: 't1',
                    name: 'Village 1',
                    x: 10,
                    y: 10,
                    fake: false,
                    playerId: 'p1',
                    safeEnabled: false,
                    safeStart: '22:00',
                    safeEnd: '04:00',
                  },
                ],
              },
              operations: [
                {
                  id: 'op1',
                  name: 'Operation 1',
                  landing: '2026-08-16T19:00',
                  serverSpeed: 3,
                  assignedAttackerIds: ['a1'],
                  assignedTargetIds: ['t1'],
                  fakeTargetIds: [],
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
              ],
              updatedAt: Date.now(),
            };
            loadedData = cleanPlan;
            // Save initial encrypted payload to cloud / local cache
            const encrypted = await encryptPayload(loadedData, sess.cryptoKey);
            void saveToCloud(sess.roomId, encrypted);
          }
        }

        setSession(sess);
        setStatus('connected');
        setStatusMsg(cloudRes.success ? `Connected to ${sess.roomName}` : `Connected to ${sess.roomName} (Offline Mode)`);
        setLastSyncedAt(new Date());

        try {
          localStorage.setItem(ROOM_STORAGE_KEY, code);
          localStorage.setItem('thronewake.v2.unlocked', '1');
        } catch {}

        onRoomDataLoadedRef.current(loadedData, sess);
      } catch (err: unknown) {
        setStatus('error');
        setStatusMsg(err instanceof Error ? err.message : 'Unknown connection error');
      } finally {
        isConnectingRef.current = false;
      }
    },
    [passcode]
  );

  const handleConnectRef = useRef(handleConnect);
  useEffect(() => {
    handleConnectRef.current = handleConnect;
  });

  // Auto-connect once on mount or when URL hash room changes
  useEffect(() => {
    const checkAndConnect = (force = false) => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const hashRoom = hashParams.get('room');
        const savedCode = localStorage.getItem(ROOM_STORAGE_KEY);
        const codeToConnect = (hashRoom || savedCode || '').trim();
        if (codeToConnect && codeToConnect.length >= 2) {
          setPasscode(codeToConnect);
          if (force || !hasAutoConnectedRef.current) {
            hasAutoConnectedRef.current = true;
            void handleConnectRef.current(codeToConnect);
          }
        }
      } catch {}
    };

    checkAndConnect(false);
    const onHashChange = () => checkAndConnect(true);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleSave = useCallback(
    async (isAutoSave = false, forceOverwrite = false) => {
      if (!session || saveInProgressRef.current) return;
      saveInProgressRef.current = true;
      setStatus('saving');
      setStatusMsg('Checking cloud & encrypting plan...');

      try {
        // Pre-save conflict check: Verify cloud hasn't been updated by another teammate in the meantime
        const cloudRes = await loadFromCloud(session.roomId);
        if (cloudRes.success && cloudRes.data) {
          try {
            const pkg = JSON.parse(cloudRes.data) as { ts?: number };
            if (lastSyncedAt && pkg.ts && pkg.ts > lastSyncedAt.getTime() + 1500) {
              if (isAutoSave) {
                setStatus('error');
                setStatusMsg('⚠️ Cloud has newer updates from a teammate. Auto-save paused.');
                return;
              }
              if (!forceOverwrite) {
                setIsConflictModalOpen(true);
                setStatus('error');
                setStatusMsg('⚠️ Newer cloud version detected from a teammate.');
                return;
              }
            }
          } catch {}
        }

        const currentData = await onSaveRequestedRef.current();
        const encrypted = await encryptPayload(currentData, session.cryptoKey);
        const res = await saveToCloud(session.roomId, encrypted);

        if (!res.success) {
          setStatus('error');
          setStatusMsg(res.error || 'Save failed');
        } else {
          setStatus('connected');
          setStatusMsg(`Saved to ${session.roomName}`);
          setLastSyncedAt(new Date());
        }
      } catch (err: unknown) {
        setStatus('error');
        setStatusMsg(err instanceof Error ? err.message : 'Save error');
      } finally {
        saveInProgressRef.current = false;
      }
    },
    [session, lastSyncedAt]
  );

  // Debounced auto-save effect
  useEffect(() => {
    if (!session || !autoSave || !hasUnsavedChanges || isConnectingRef.current || saveInProgressRef.current) return;
    const timer = setTimeout(() => {
      void handleSave(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [session, autoSave, hasUnsavedChanges, handleSave]);

  const handleSync = useCallback(async () => {
    if (!session) return;
    setStatus('connecting');
    setStatusMsg('Checking cloud updates...');

    try {
      const cloudRes = await loadFromCloud(session.roomId);
      if (!cloudRes.success || !cloudRes.data) {
        setStatus('connected');
        setStatusMsg('Already up to date');
        setLastSyncedAt(new Date());
        return;
      }

      const decrypted = await decryptPayload<TeamRoomData>(cloudRes.data, session.cryptoKey);
      if (decrypted) {
        onRoomDataLoadedRef.current(decrypted, session);
        setStatus('connected');
        setStatusMsg('Synced from cloud');
        setLastSyncedAt(new Date());
      } else {
        setStatus('error');
        setStatusMsg('Decryption failed on sync');
      }
    } catch {
      setStatus('error');
      setStatusMsg('Sync error');
    }
  }, [session]);

  const handleSyncClick = () => {
    if (hasUnsavedChanges) {
      setIsSyncConfirmOpen(true);
    } else {
      void handleSync();
    }
  };

  const handleDisconnect = () => {
    setSession(null);
    setStatus('idle');
    setStatusMsg('');
    try {
      localStorage.removeItem(ROOM_STORAGE_KEY);
      localStorage.removeItem('thronewake.v2.unlocked');
    } catch {}
    onRoomDisconnectedRef.current();
  };

  const syncTimeStr = lastSyncedAt
    ? `${String(lastSyncedAt.getUTCHours()).padStart(2, '0')}:${String(
        lastSyncedAt.getUTCMinutes()
      ).padStart(2, '0')}:${String(lastSyncedAt.getUTCSeconds()).padStart(2, '0')} UTC`
    : null;

  const showTransientStatus = Boolean(session && statusMsg && status !== 'connected');

  return (
    <>
      <section className="op-team-room-bar panel op-unified-room-card" aria-label="Team Room Cloud Sync">
        {/* Top Secret Classified Header Strip */}
        <div className="op-unified-room-card__classified-strip">
          <div className="op-v2-classified-banner__left">
            <span className="op-v2-classified-banner__pulse" />
            <span className="op-v2-classified-banner__title">🕵️ TOP SECRET CLASSIFIED MODE</span>
            <span className="op-team-room-badge">
              <span className="op-team-room-badge__icon">🛡️</span> Team Room
            </span>
            <span className="op-v2-classified-banner__tag">v2 Live Collaboration</span>
          </div>
          <span
            className="op-team-room-secure-pill"
            title="End-to-End Encrypted: Only people with the secret code can decrypt and read your plans."
          >
            🔒 Zero-Knowledge AES-256
          </span>
        </div>

        {/* Main Content Strip: Room Connection + Server Speed + Live Status */}
        <div className="op-team-room-bar__content">
          <div className="op-team-room-bar__left">
            {!session ? (
              <div className="op-team-room-form">
                <input
                  type="text"
                  className="text-input op-team-room-input"
                  placeholder="Enter secret code (e.g. password123)..."
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConnect();
                  }}
                  disabled={status === 'connecting'}
                  aria-label="Secret Team Room Code"
                />
                <button
                  type="button"
                  className="pill pill--primary"
                  onClick={() => handleConnect()}
                  disabled={status === 'connecting' || !passcode.trim()}
                >
                  {status === 'connecting' ? 'Connecting...' : 'Connect Room'}
                </button>
              </div>
            ) : (
              <div className="op-team-room-active">
                <span className="op-team-room-connected-tag">
                  <span className="op-team-room-live-dot" />
                  Room: <strong>{session.roomName}</strong>
                </span>

                <div className="op-team-room-actions">
                  <button
                    type="button"
                    className={`pill pill--tiny ${hasUnsavedChanges ? 'pill--primary op-save-btn--dirty' : 'pill--primary'}`}
                    onClick={() => handleSave(false, false)}
                    disabled={status === 'saving'}
                    title="Save current plan to this room"
                  >
                    {status === 'saving' ? '💾 Saving...' : '💾 Save Room'}
                  </button>

                  <details className="op-room-menu">
                    <summary>Room options</summary>
                    <div className="op-room-menu__panel">
                      <button
                        type="button"
                        className={`pill pill--tiny ${autoSave ? 'pill--primary op-autosave-active' : 'pill--secondary'}`}
                        onClick={toggleAutoSave}
                        title="Automatically save changes to the cloud in background"
                      >
                        {autoSave ? '⚡ Auto-Save: ON' : '⚡ Auto-Save: OFF'}
                      </button>
                      <button
                        type="button"
                        className="pill pill--tiny pill--secondary"
                        onClick={handleSyncClick}
                        title="Pull latest changes from other members"
                      >
                        🔄 Sync
                      </button>
                      <button
                        type="button"
                        className="pill pill--tiny pill--secondary op-team-room-leave"
                        onClick={handleDisconnect}
                        title="Disconnect from this room"
                      >
                        Leave Room
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>

          <div className="op-team-room-bar__right">
            {/* Global Room Server Speed Control */}
            {onServerSpeedChange && (
              <div className="op-room-speed-control">
                <span className="op-room-speed-label">⚡ Speed:</span>
                <div className="op-room-speed-buttons" role="group" aria-label="Server Speed">
                  {[1, 2, 3, 5].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      className={`pill pill--tiny ${serverSpeed === spd ? 'is-active pill--primary' : 'pill--secondary'}`}
                      onClick={() => onServerSpeedChange(spd)}
                      title={`Set server speed to ${spd}× for all operations in this room`}
                    >
                      {spd}×
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showTransientStatus ? (
              <span className={`op-team-room-status op-team-room-status--${status}`} role="status">
                {statusMsg}
              </span>
            ) : session && (
              hasUnsavedChanges ? (
                <span className="op-team-room-status op-team-room-status--dirty">
                  ● Unsaved Local Changes
                </span>
              ) : (
                <span className="op-team-room-status op-team-room-status--connected">
                  ✓ Up to Date
                </span>
              )
            )}

            {syncTimeStr && session && !hasUnsavedChanges && (
              <span className="op-team-room-synctime">
                Last synced: {syncTimeStr}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Sync Overwrite Confirmation Modal */}
      {isSyncConfirmOpen && (
        <div className="op-modal-backdrop" onClick={() => setIsSyncConfirmOpen(false)} role="dialog" aria-modal="true">
          <div className="op-modal op-modal--compact" onClick={(e) => e.stopPropagation()}>
            <div className="op-modal__header">
              <div className="op-modal__title-wrap">
                <span className="op-modal__icon">⚠️</span>
                <div>
                  <h2 className="op-modal__title">Unsaved Local Changes</h2>
                  <p className="op-modal__subtitle">
                    You have edits on your screen that haven't been pushed to the cloud room yet.
                  </p>
                </div>
              </div>
              <button type="button" className="op-modal-close" onClick={() => setIsSyncConfirmOpen(false)} aria-label="Close modal">
                ✕
              </button>
            </div>

            <div className="op-modal__body" style={{ padding: '16px 20px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                Pulling from the cloud will overwrite your local changes with whatever is currently in the room. What would you like to do?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  className="pill pill--primary"
                  style={{ padding: '8px 14px', textAlign: 'center', justifyContent: 'center' }}
                  onClick={async () => {
                    setIsSyncConfirmOpen(false);
                    await handleSave(false, true);
                    await handleSync();
                  }}
                >
                  💾 Save Local to Cloud First, Then Sync
                </button>

                <button
                  type="button"
                  className="pill"
                  style={{
                    padding: '8px 14px',
                    textAlign: 'center',
                    justifyContent: 'center',
                    background: 'rgba(235, 87, 87, 0.15)',
                    border: '1px solid #eb5757',
                    color: '#ff6b6b',
                  }}
                  onClick={async () => {
                    setIsSyncConfirmOpen(false);
                    await handleSync();
                  }}
                >
                  ⚠️ Discard Local Edits & Pull Cloud
                </button>

                <button
                  type="button"
                  className="pill pill--secondary"
                  style={{ padding: '8px 14px', textAlign: 'center', justifyContent: 'center' }}
                  onClick={() => setIsSyncConfirmOpen(false)}
                >
                  Cancel (Keep Local Edits)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Save Conflict Modal */}
      {isConflictModalOpen && (
        <div className="op-modal-backdrop" onClick={() => setIsConflictModalOpen(false)} role="dialog" aria-modal="true">
          <div className="op-modal op-modal--compact" onClick={(e) => e.stopPropagation()}>
            <div className="op-modal__header">
              <div className="op-modal__title-wrap">
                <span className="op-modal__icon">⚠️</span>
                <div>
                  <h2 className="op-modal__title">Cloud Conflict Detected</h2>
                  <p className="op-modal__subtitle">
                    Another teammate saved newer changes to this room since you last synced.
                  </p>
                </div>
              </div>
              <button type="button" className="op-modal-close" onClick={() => setIsConflictModalOpen(false)} aria-label="Close modal">
                ✕
              </button>
            </div>

            <div className="op-modal__body" style={{ padding: '16px 20px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                If you overwrite now, you will replace their changes with your local version.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  className="pill pill--primary"
                  style={{ padding: '8px 14px', textAlign: 'center', justifyContent: 'center' }}
                  onClick={async () => {
                    setIsConflictModalOpen(false);
                    await handleSync();
                  }}
                >
                  🔄 Pull Teammate's Changes (Sync)
                </button>

                <button
                  type="button"
                  className="pill"
                  style={{ padding: '8px 14px', textAlign: 'center', justifyContent: 'center', color: '#ff6b6b' }}
                  onClick={async () => {
                    setIsConflictModalOpen(false);
                    await handleSave(false, true);
                  }}
                >
                  ⚠️ Overwrite Cloud With My Version
                </button>

                <button
                  type="button"
                  className="pill pill--secondary"
                  style={{ padding: '8px 14px', textAlign: 'center', justifyContent: 'center' }}
                  onClick={() => setIsConflictModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
