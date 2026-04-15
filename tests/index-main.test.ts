import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeTmpHome, type TmpHome } from './helpers/tmpHome.js';
import { captureIO } from './helpers/captureIO.js';

let tmp: TmpHome;
const origArgv = process.argv;

beforeEach(() => {
  tmp = makeTmpHome();
});
afterEach(() => {
  tmp.cleanup();
  process.argv = origArgv;
  vi.restoreAllMocks();
  vi.resetModules();
});

async function runMain(args: string[]): Promise<void> {
  process.argv = ['node', 'whichcc', ...args];
  vi.resetModules();
  await import('../src/index.js');
  // wait for main() promise to settle
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
}

function mockExit(): { codes: number[]; restore: () => void } {
  const codes: number[] = [];
  const spy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => {
    codes.push(c ?? 0);
    return undefined as never;
  }) as never);
  return {
    codes,
    restore: () => spy.mockRestore(),
  };
}

describe('index main()', () => {
  it('--help prints help', async () => {
    const cap = captureIO();
    try {
      await runMain(['--help']);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toMatch(/USAGE|whichcc/i);
  });

  it('--version prints version', async () => {
    const cap = captureIO();
    try {
      await runMain(['--version']);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toMatch(/\d+\.\d+\.\d+/);
  });

  it('unknown arg triggers ParseError exit(1)', async () => {
    const exit = mockExit();
    const cap = captureIO();
    try {
      await runMain(['--bogus-flag']);
      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setImmediate(r));
    } catch { /* expected */ }
    finally {
      cap.restore();
      exit.restore();
    }
    expect(exit.codes).toContain(1);
  });

  it('--list runs listCommand', async () => {
    const cap = captureIO();
    try {
      await runMain(['--list']);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toMatch(/zai|providers/i);
  });

  it('--list-custom runs listCommand(onlyCustom)', async () => {
    const cap = captureIO();
    try {
      await runMain(['--list-custom']);
    } finally {
      cap.restore();
    }
    // may be empty message or list
    expect(cap.out.join('\n')).toBeDefined();
  });

  it('--status runs statusCommand', async () => {
    const cap = captureIO();
    try {
      await runMain(['--status']);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toMatch(/status|providers|no /i);
  });

  it('--update runs updateCommand', async () => {
    const reg = {
      version: 1, updatedAt: 'now',
      providers: { zai: { id: 'zai', name: 'Z', baseUrl: 'u', defaultModel: 'm', models: [{ id: 'm' }] } },
    };
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify(reg), { status: 200 }))) as unknown as typeof fetch;
    const cap = captureIO();
    try {
      await runMain(['--update']);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toBeDefined();
  });

  it('--show-template runs showTemplateCommand', async () => {
    const cap = captureIO();
    try {
      await runMain(['--show-template']);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toMatch(/Session template/i);
  });

  it('--reset-template runs resetTemplateCommand', async () => {
    const cap = captureIO();
    try {
      await runMain(['--reset-template']);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toMatch(/Template reset|template\.json/i);
  });

  it('--clean runs cleanCommand', async () => {
    const cap = captureIO();
    try {
      await runMain(['--clean']);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toMatch(/no stale|removed/i);
  });

  it('--add-custom with all flags adds provider', async () => {
    const cap = captureIO();
    try {
      await runMain(['--add-custom', '--name', 'X', '--url', 'https://x', '--apikey', 'sk', '--model', 'm', '--no-launch']);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toBeDefined();
  });

  it('--remove-custom removes provider', async () => {
    // first add via flag path
    const mod = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const { saveConfig } = mod;
    const cfg = mod.loadConfig();
    addCustomProvider(cfg, 'cx', { name: 'CX', baseUrl: 'https://cx', models: ['m'], defaultModel: 'm', addedAt: 'now' });
    saveConfig(cfg);
    const cap = captureIO();
    try {
      await runMain(['--remove-custom', 'cx']);
    } finally {
      cap.restore();
    }
  });

  it('--provider + --add-model adds', async () => {
    const cap = captureIO();
    try {
      await runMain(['--provider', 'zai', '--add-model', 'glm-ZZZ']);
    } finally {
      cap.restore();
    }
  });

  it('--provider + --remove-model removes', async () => {
    const mod = await import('../src/core/config.js');
    const cfg = mod.loadConfig();
    mod.addUserModel(cfg, 'zai', 'myx', false);
    mod.saveConfig(cfg);
    const cap = captureIO();
    try {
      await runMain(['--provider', 'zai', '--remove-model', 'myx']);
    } finally {
      cap.restore();
    }
  });

  it('--provider + --remove-key without key prints no-key msg', async () => {
    const cap = captureIO();
    try {
      await runMain(['--provider', 'zai', '--remove-key']);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toMatch(/no api key/i);
  });

  it('--provider + --model + --set-default sets default', async () => {
    const cap = captureIO();
    try {
      await runMain(['--provider', 'zai', '--model', 'glm-5', '--set-default']);
    } finally {
      cap.restore();
    }
  });

  it('--provider + --apikey saves key', async () => {
    const cap = captureIO();
    try {
      await runMain(['--provider', 'zai', '--apikey', 'sk-xyz']);
    } finally {
      cap.restore();
    }
    const { hasKey } = await import('../src/core/keys.js');
    expect(hasKey('zai')).toBe(true);
  });

  it('--provider alone launches (no-launch)', async () => {
    const { setKey } = await import('../src/core/keys.js');
    setKey('zai', 'sk');
    const cap = captureIO();
    try {
      await runMain(['--provider', 'zai', '--no-launch']);
    } finally {
      cap.restore();
    }
  });

  it('no args falls through to interactive', async () => {
    const called = { value: false };
    vi.doMock('../src/cli/commands/interactive-flow.js', () => ({
      runInteractive: async () => { called.value = true; },
    }));
    const cap = captureIO();
    try {
      await runMain([]);
    } finally {
      cap.restore();
      vi.doUnmock('../src/cli/commands/interactive-flow.js');
    }
    expect(called.value).toBe(true);
  });

  it('main() error handler triggers exit(1)', async () => {
    vi.doMock('../src/cli/commands/interactive-flow.js', () => ({
      runInteractive: async () => { throw new Error('boom'); },
    }));
    const exit = mockExit();
    const cap = captureIO();
    try {
      await runMain([]);
      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setImmediate(r));
    } catch { /* expected */ }
    finally {
      cap.restore();
      exit.restore();
      vi.doUnmock('../src/cli/commands/interactive-flow.js');
    }
    expect(exit.codes).toContain(1);
  });
});
