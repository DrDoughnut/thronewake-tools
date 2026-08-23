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

interface TeamRoomBarProps {
  onRoomDataLoaded: (data: TeamRoomData, session: RoomCryptoSession) => void;
  onRoomDisconnected: () => void;
  onSaveRequested: () => Promise<TeamRoomData>;
}

export function TeamRoomBar({
  onRoomDataLoaded,
  onRoomDisconnected,
  onSaveRequested,
}: TeamRoomBarProps) {
  const [passcode, setPasscode] = useState('');
  const [session, setSession] = useState<RoomCryptoSession | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'saving' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

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

        setStatusMsg('Connecting to cloud room...');
        const cloudRes = await loadFromCloud(sess.roomId);

        if (!cloudRes.success) {
          setStatus('error');
          setStatusMsg(cloudRes.error || 'Failed to connect to cloud');
          return;
        }

        let loadedData: TeamRoomData | null = null;

        if (cloudRes.data) {
          // Decrypt existing room payload
          loadedData = await decryptPayload<TeamRoomData>(cloudRes.data, sess.cryptoKey);
          if (!loadedData) {
            setStatus('error');
            setStatusMsg('Decryption failed: Room payload was modified or corrupted.');
            return;
          }
        } else {
          // New Room initialized with current local plan
          const currentPlan = await onSaveRequestedRef.current();
          loadedData = currentPlan;
          // Save initial encrypted payload to cloud
          const encrypted = await encryptPayload(loadedData, sess.cryptoKey);
          await saveToCloud(sess.roomId, encrypted);
        }

        setSession(sess);
        setStatus('connected');
        setStatusMsg(`Connected to ${sess.roomName}`);
        setLastSyncedAt(new Date());

        try {
          localStorage.setItem(ROOM_STORAGE_KEY, code);
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

  // Auto-connect once on mount if saved room passcode exists
  useEffect(() => {
    if (hasAutoConnectedRef.current) return;
    hasAutoConnectedRef.current = true;
    try {
      const savedCode = localStorage.getItem(ROOM_STORAGE_KEY);
      if (savedCode && savedCode.trim().length >= 2) {
        setPasscode(savedCode);
        void handleConnect(savedCode);
      }
    } catch {}
  }, [handleConnect]);

  const handleSave = useCallback(async () => {
    if (!session || saveInProgressRef.current) return;
    saveInProgressRef.current = true;
    setStatus('saving');
    setStatusMsg('Encrypting & saving plan...');

    try {
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
  }, [session]);

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

  const handleDisconnect = () => {
    setSession(null);
    setStatus('idle');
    setStatusMsg('');
    try {
      localStorage.removeItem(ROOM_STORAGE_KEY);
    } catch {}
    onRoomDisconnectedRef.current();
  };

  const syncTimeStr = lastSyncedAt
    ? `${String(lastSyncedAt.getUTCHours()).padStart(2, '0')}:${String(
        lastSyncedAt.getUTCMinutes()
      ).padStart(2, '0')}:${String(lastSyncedAt.getUTCSeconds()).padStart(2, '0')} UTC`
    : null;

  return (
    <section className="op-team-room-bar panel" aria-label="Team Room Cloud Sync">
      <div className="op-team-room-bar__content">
        <div className="op-team-room-bar__left">
          <div className="op-team-room-bar__title-wrap">
            <span className="op-team-room-badge">
              <span className="op-team-room-badge__icon">🛡️</span> Team Room
            </span>
            <span className="op-team-room-secure-pill" title="End-to-End Encrypted: Only people with the secret code can decrypt and read your plans.">
              🔒 Zero-Knowledge AES-256
            </span>
          </div>

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
                  className="pill pill--tiny pill--primary"
                  onClick={handleSave}
                  disabled={status === 'saving'}
                  title="Save current plan to this room"
                >
                  {status === 'saving' ? '💾 Saving...' : '💾 Save Room'}
                </button>
                <button
                  type="button"
                  className="pill pill--tiny pill--secondary"
                  onClick={handleSync}
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
            </div>
          )}
        </div>

        <div className="op-team-room-bar__right">
          {statusMsg && (
            <span
              className={`op-team-room-status op-team-room-status--${status}`}
              role="status"
            >
              {statusMsg}
            </span>
          )}
          {syncTimeStr && session && (
            <span className="op-team-room-synctime">
              Last synced: {syncTimeStr}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
