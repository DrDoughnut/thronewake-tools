// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveRoomSession, encryptPayload } from '../engine/cryptoSync';
import type { TeamRoomData } from '../engine/operations';
import { TeamRoomBar } from './TeamRoomBar';

const ROOM_CODE = 'red-falcon-ops';

/**
 * Stands in for the room server. Reads answer however a test says; every write
 * is recorded, because the whole point here is to prove when one does not happen.
 */
function fakeServer() {
  const writes: string[] = [];
  let read: () => Promise<unknown> = async () => ({ result: null });

  const fetch = vi.fn(async (_url: string, init: { body: string }) => {
    const [command, , value] = JSON.parse(init.body) as [string, string, string?];
    if (command === 'SET') {
      writes.push(value ?? '');
      return { ok: true, status: 200, json: async () => ({ result: 'OK' }) };
    }
    const body = await read();
    return { ok: true, status: 200, json: async () => body };
  });

  return {
    fetch,
    writes,
    answerReadsWith(next: () => Promise<unknown>) {
      read = next;
    },
  };
}

const unreachable = () => Promise.reject(new TypeError('Failed to fetch'));

async function sealed(data: unknown): Promise<{ cipher: string; roomId: string }> {
  const session = (await deriveRoomSession(ROOM_CODE))!;
  return { cipher: await encryptPayload(data, session.cryptoKey), roomId: session.roomId };
}

async function until(check: () => boolean, label: string) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
  }
  throw new Error(`timed out waiting for: ${label}`);
}

describe('TeamRoomBar sync safety', () => {
  let container: HTMLDivElement;
  let root: Root;
  let server: ReturnType<typeof fakeServer>;
  let loaded: TeamRoomData[];

  const statusText = () => container.textContent ?? '';

  const mount = async (current?: TeamRoomData) => {
    await act(async () => {
      root.render(
        <TeamRoomBar
          onRoomDataLoaded={(data) => loaded.push(data)}
          onRoomDisconnected={() => {}}
          onSaveRequested={async () => current ?? loaded[loaded.length - 1]}
        />,
      );
    });
  };

  beforeEach(() => {
    server = fakeServer();
    globalThis.fetch = server.fetch as unknown as typeof fetch;
    loaded = [];
    localStorage.clear();
    // A remembered room code makes the bar connect on mount, as it does for
    // anyone returning to the planner.
    localStorage.setItem('thronewake.teamroom.session', ROOM_CODE);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('never invents and saves a room when the server cannot be reached', async () => {
    server.answerReadsWith(unreachable);
    await mount();

    await until(() => statusText().includes("Couldn't reach the room server"), 'error shown');
    expect(server.writes).toHaveLength(0);
    expect(loaded).toHaveLength(0);
  });

  it('creates and saves a room only when the server says it holds nothing', async () => {
    server.answerReadsWith(async () => ({ result: null }));
    await mount();

    await until(() => server.writes.length === 1, 'new room saved');
    expect(loaded[0]?.roomName).toBe(ROOM_CODE);
  });

  it('shows the last local copy, marked offline, and writes nothing', async () => {
    const plan = { version: 2, roomName: ROOM_CODE, marker: 'from-cache' };
    const { cipher, roomId } = await sealed(plan);
    localStorage.setItem(`thronewake.room_cache.${roomId}`, cipher);
    server.answerReadsWith(unreachable);
    await mount();

    await until(() => statusText().includes('Offline'), 'offline status shown');
    expect((loaded[0] as unknown as { marker: string }).marker).toBe('from-cache');
    // Offline must not collapse into the green "Up to Date" badge.
    expect(statusText()).not.toContain('Up to Date');
    expect(server.writes).toHaveLength(0);
  });

  it('restores a room the server lost from the copy this browser holds', async () => {
    const plan = { version: 2, roomName: ROOM_CODE, marker: 'survivor' };
    const { cipher, roomId } = await sealed(plan);
    localStorage.setItem(`thronewake.room_cache.${roomId}`, cipher);
    server.answerReadsWith(async () => ({ result: null }));
    await mount();

    await until(() => server.writes.length === 1, 'room restored');
    expect((loaded[0] as unknown as { marker: string }).marker).toBe('survivor');
  });

  it('refuses to save when the read before the save fails', async () => {
    const plan = { version: 2, roomName: ROOM_CODE, operations: [] };
    const { cipher } = await sealed(plan);
    server.answerReadsWith(async () => ({ result: cipher }));
    await mount();
    await until(() => loaded.length === 1, 'connected');

    // The connection drops between loading the room and saving it.
    server.answerReadsWith(unreachable);
    const save = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Save Room'));
    expect(save).toBeTruthy();
    await act(async () => {
      save!.click();
    });

    await until(() => statusText().includes('Not saved'), 'save refused');
    expect(server.writes).toHaveLength(0);
  });
});
