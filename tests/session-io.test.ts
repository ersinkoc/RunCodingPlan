import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeTmpHome, type TmpHome } from './helpers/tmpHome.js';
import { existsSync, mkdirSync, writeFileSync, utimesSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let tmp: TmpHome;

beforeEach(() => {
  tmp = makeTmpHome();
});
afterEach(() => {
  tmp.cleanup();
});

describe('session file I/O', () => {
  it('writeSessionFile writes under ~/.claude', async () => {
    const { buildSessionSettings, writeSessionFile } = await import('../src/core/session.js');
    const s = buildSessionSettings('url', 'key', 'model', {
      statusLine: true,
      statusLineCommand: 'npx -y ccstatusline@latest',
    });
    const path = writeSessionFile('zai', s);
    expect(existsSync(path)).toBe(true);
    const data = JSON.parse(readFileSync(path, 'utf8')) as typeof s;
    expect(data.env.ANTHROPIC_BASE_URL).toBe('url');
    expect(data.statusLine?.command).toBe('npx -y ccstatusline@latest');
    expect(path.includes(tmp.claudeDir)).toBe(true);
  });

  it('cleanOldSessions removes stale session files', async () => {
    const { CLAUDE_DIR } = await import('../src/constants.js');
    mkdirSync(CLAUDE_DIR, { recursive: true });
    const oldPath = join(CLAUDE_DIR, 'whichcc-zai-123.json');
    const freshPath = join(CLAUDE_DIR, 'whichcc-kimi-456.json');
    writeFileSync(oldPath, '{}');
    writeFileSync(freshPath, '{}');
    const past = (Date.now() - 48 * 60 * 60 * 1000) / 1000;
    utimesSync(oldPath, past, past);
    const { cleanOldSessions } = await import('../src/core/session.js');
    const removed = cleanOldSessions();
    expect(removed).toContain(oldPath);
    expect(existsSync(oldPath)).toBe(false);
    expect(existsSync(freshPath)).toBe(true);
  });

  it('cleanOldSessions returns [] when dir missing', async () => {
    const { cleanOldSessions } = await import('../src/core/session.js');
    expect(cleanOldSessions()).toEqual([]);
  });

  it('listSessionFiles filters by prefix and suffix', async () => {
    const { CLAUDE_DIR } = await import('../src/constants.js');
    mkdirSync(CLAUDE_DIR, { recursive: true });
    writeFileSync(join(CLAUDE_DIR, 'whichcc-x-1.json'), '{}');
    writeFileSync(join(CLAUDE_DIR, 'settings.json'), '{}');
    writeFileSync(join(CLAUDE_DIR, 'whichcc-x-2.txt'), 'nope');
    const { listSessionFiles } = await import('../src/core/session.js');
    const files = listSessionFiles();
    expect(files.length).toBe(1);
    expect(files[0]?.endsWith('whichcc-x-1.json')).toBe(true);
  });

  it('listSessionFiles returns [] when dir missing', async () => {
    const { listSessionFiles } = await import('../src/core/session.js');
    expect(listSessionFiles()).toEqual([]);
  });

  it('cleanOldSessions ignores non-stale sessions', async () => {
    const { CLAUDE_DIR } = await import('../src/constants.js');
    mkdirSync(CLAUDE_DIR, { recursive: true });
    const freshPath = join(CLAUDE_DIR, 'whichcc-a-1.json');
    writeFileSync(freshPath, '{}');
    const { cleanOldSessions } = await import('../src/core/session.js');
    expect(cleanOldSessions()).toEqual([]);
  });

  it('removeSessionFile deletes existing file and returns true', async () => {
    const { CLAUDE_DIR } = await import('../src/constants.js');
    mkdirSync(CLAUDE_DIR, { recursive: true });
    const p = join(CLAUDE_DIR, 'whichcc-test-999.json');
    writeFileSync(p, '{}');
    const { removeSessionFile } = await import('../src/core/session.js');
    expect(removeSessionFile(p)).toBe(true);
    expect(existsSync(p)).toBe(false);
  });

  it('removeSessionFile returns false when file missing', async () => {
    const { CLAUDE_DIR } = await import('../src/constants.js');
    const p = join(CLAUDE_DIR, 'whichcc-missing.json');
    const { removeSessionFile } = await import('../src/core/session.js');
    expect(removeSessionFile(p)).toBe(false);
  });

  it('removeSessionFile swallows unlink errors', async () => {
    const { CLAUDE_DIR } = await import('../src/constants.js');
    mkdirSync(CLAUDE_DIR, { recursive: true });
    const p = join(CLAUDE_DIR, 'whichcc-err.json');
    writeFileSync(p, '{}');
    vi.resetModules();
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      return {
        ...actual,
        unlinkSync: () => {
          throw new Error('permission');
        },
      };
    });
    const { removeSessionFile } = await import('../src/core/session.js');
    expect(removeSessionFile(p)).toBe(false);
    vi.doUnmock('node:fs');
    vi.resetModules();
  });
});
