import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { captureIO } from './helpers/captureIO.js';

describe('launchClaudeCode', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function setup(opts: { emit: 'error-enoent' | 'error-other' | 'exit-0' | 'exit-5' }) {
    const ee = new EventEmitter() as EventEmitter & { stdio: unknown };
    vi.doMock('node:child_process', () => ({
      spawn: vi.fn(() => ee),
    }));
    const { launchClaudeCode } = await import('../src/core/launcher.js');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`EXIT_${code ?? 0}`);
    }) as never);

    return { ee, launchClaudeCode, exitSpy };
  }

  it('handles ENOENT with install hint', async () => {
    const { ee, launchClaudeCode } = await setup({ emit: 'error-enoent' });
    const cap = captureIO();
    try {
      expect(() => {
        launchClaudeCode({ sessionPath: '/tmp/s.json', skipDangerous: true });
        const err: NodeJS.ErrnoException = new Error('not found');
        err.code = 'ENOENT';
        ee.emit('error', err);
      }).toThrow(/EXIT_1/);
    } finally {
      cap.restore();
    }
    expect(cap.err.join('\n')).toContain('Claude Code not found');
  });

  it('handles generic error with message', async () => {
    const { ee, launchClaudeCode } = await setup({ emit: 'error-other' });
    const cap = captureIO();
    try {
      expect(() => {
        launchClaudeCode({ sessionPath: '/tmp/s.json', skipDangerous: false });
        ee.emit('error', new Error('boom'));
      }).toThrow(/EXIT_1/);
    } finally {
      cap.restore();
    }
    expect(cap.err.join('\n')).toContain('Failed to launch');
  });

  it('forwards child exit code', async () => {
    const { ee, launchClaudeCode } = await setup({ emit: 'exit-5' });
    expect(() => {
      launchClaudeCode({ sessionPath: '/tmp/s.json', skipDangerous: false });
      ee.emit('exit', 5);
    }).toThrow(/EXIT_5/);
  });

  it('exits 0 when child exit code is null', async () => {
    const { ee, launchClaudeCode } = await setup({ emit: 'exit-0' });
    expect(() => {
      launchClaudeCode({ sessionPath: '/tmp/s.json', skipDangerous: false });
      ee.emit('exit', null);
    }).toThrow(/EXIT_0/);
  });
});

describe('launchClaudeCode spawn strategy', () => {
  const origEnv = { ...process.env };
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...origEnv };
  });
  afterEach(() => {
    vi.restoreAllMocks();
    process.env = origEnv;
  });

  async function setupSpawnSpy(binary: string) {
    const ee = new EventEmitter() as EventEmitter & { stdio: unknown };
    const spawnSpy = vi.fn(() => ee);
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      return { ...actual, existsSync: (p: string) => p === binary };
    });
    vi.doMock('node:child_process', async () => {
      const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
      return { ...actual, spawn: spawnSpy };
    });
    process.env['WHICHCC_CLAUDE_BIN'] = binary;
    const { launchClaudeCode } = await import('../src/core/launcher.js');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`EXIT_${code ?? 0}`);
    }) as never);
    return { spawnSpy, launchClaudeCode, exitSpy };
  }

  it('spawns .exe directly without cmd.exe wrapper', async () => {
    const { platform } = await vi.importActual<typeof import('node:os')>('node:os');
    if (platform() !== 'win32') return;
    const exePath = 'C:\\Users\\me\\.local\\bin\\claude.exe';
    const { spawnSpy, launchClaudeCode } = await setupSpawnSpy(exePath);
    launchClaudeCode({ sessionPath: '/tmp/s.json', skipDangerous: false });
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    expect(spawnSpy.mock.calls[0]?.[0]).toBe(exePath);
  });

  it('wraps .cmd with cmd.exe /c on Windows', async () => {
    const { platform } = await vi.importActual<typeof import('node:os')>('node:os');
    if (platform() !== 'win32') return;
    const cmdPath = 'C:\\Users\\me\\AppData\\Roaming\\npm\\claude.cmd';
    const { spawnSpy, launchClaudeCode } = await setupSpawnSpy(cmdPath);
    launchClaudeCode({ sessionPath: '/tmp/s.json', skipDangerous: true });
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    expect(spawnSpy.mock.calls[0]?.[0]).toBe('cmd.exe');
    const args = spawnSpy.mock.calls[0]?.[1] as string[];
    expect(args[0]).toBe('/c');
    expect(args[1]).toBe(cmdPath);
    expect(args).toContain('--dangerously-skip-permissions');
  });
});

describe('resolveClaudeBinary', () => {
  const origEnv = { ...process.env };
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...origEnv };
    delete process.env['WHICHCC_CLAUDE_BIN'];
  });
  afterEach(() => {
    vi.restoreAllMocks();
    process.env = origEnv;
  });

  it('returns WHICHCC_CLAUDE_BIN override when file exists', async () => {
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      return { ...actual, existsSync: (p: string) => p === '/custom/claude' };
    });
    process.env['WHICHCC_CLAUDE_BIN'] = '/custom/claude';
    const { resolveClaudeBinary } = await import('../src/core/launcher.js');
    expect(resolveClaudeBinary()).toBe('/custom/claude');
  });

  it('ignores WHICHCC_CLAUDE_BIN when file does not exist', async () => {
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      return { ...actual, existsSync: () => false };
    });
    vi.doMock('node:child_process', async () => {
      const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
      return { ...actual, execFileSync: () => { throw new Error('not found'); } };
    });
    process.env['WHICHCC_CLAUDE_BIN'] = '/nope';
    const { resolveClaudeBinary } = await import('../src/core/launcher.js');
    const result = resolveClaudeBinary();
    expect(['claude', 'claude.exe', 'claude.cmd']).toContain(result);
  });

  it('returns path from where/which when found', async () => {
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      return { ...actual, existsSync: (p: string) => p.includes('found-claude') };
    });
    vi.doMock('node:child_process', async () => {
      const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
      return {
        ...actual,
        execFileSync: () => '/path/to/found-claude\r\n/other/path\n',
      };
    });
    const { resolveClaudeBinary } = await import('../src/core/launcher.js');
    expect(resolveClaudeBinary()).toBe('/path/to/found-claude');
  });

  it('falls through to common paths when where/which fails', async () => {
    const { platform } = await vi.importActual<typeof import('node:os')>('node:os');
    const isWindows = platform() === 'win32';
    const target = isWindows
      ? `${process.env['USERPROFILE'] ?? ''}\\.local\\bin\\claude.exe`
      : `${process.env['HOME'] ?? ''}/.local/bin/claude`;
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      return { ...actual, existsSync: (p: string) => p === target };
    });
    vi.doMock('node:child_process', async () => {
      const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
      return { ...actual, execFileSync: () => { throw new Error('not found'); } };
    });
    const { resolveClaudeBinary } = await import('../src/core/launcher.js');
    expect(resolveClaudeBinary()).toBe(target);
  });

  it('returns bare name when nothing found anywhere', async () => {
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      return { ...actual, existsSync: () => false };
    });
    vi.doMock('node:child_process', async () => {
      const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
      return { ...actual, execFileSync: () => { throw new Error('not found'); } };
    });
    const { resolveClaudeBinary } = await import('../src/core/launcher.js');
    const result = resolveClaudeBinary();
    expect(['claude', 'claude.exe', 'claude.cmd']).toContain(result);
  });

  it('tries next name when first where/which lookup fails', async () => {
    let callCount = 0;
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      return { ...actual, existsSync: (p: string) => p === '/found/on/second/try' };
    });
    vi.doMock('node:child_process', async () => {
      const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
      return {
        ...actual,
        execFileSync: () => {
          callCount += 1;
          if (callCount === 1) throw new Error('first name not found');
          return '/found/on/second/try\n';
        },
      };
    });
    const { resolveClaudeBinary } = await import('../src/core/launcher.js');
    expect(resolveClaudeBinary()).toBe('/found/on/second/try');
  });

  it('where returns empty string — falls through', async () => {
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      return { ...actual, existsSync: () => false };
    });
    vi.doMock('node:child_process', async () => {
      const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
      return { ...actual, execFileSync: () => '\r\n' };
    });
    const { resolveClaudeBinary } = await import('../src/core/launcher.js');
    const result = resolveClaudeBinary();
    expect(['claude', 'claude.exe', 'claude.cmd']).toContain(result);
  });
});
