import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeTmpHome, type TmpHome } from './helpers/tmpHome.js';
import { captureIO } from './helpers/captureIO.js';

let tmp: TmpHome;

beforeEach(() => {
  tmp = makeTmpHome();
});
afterEach(() => {
  tmp.cleanup();
  vi.restoreAllMocks();
});

function expectExit(fn: () => void, code: number): void {
  const spy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => {
    throw new Error(`EXIT_${c}`);
  }) as never);
  try {
    expect(fn).toThrow(new RegExp(`EXIT_${code}`));
  } finally {
    spy.mockRestore();
  }
}

describe('launchCommand', () => {
  it('errors when provider is missing', async () => {
    const { launchCommand } = await import('../src/cli/commands/launch.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      expectExit(() => launchCommand({ update: false, list: false, listCustom: false, status: false, removeKey: false, addCustom: false, setDefault: false, clean: false, noLaunch: false, dryRun: false, version: false, help: false }, getDefaultConfig()), 1);
    } finally {
      cap.restore();
    }
    expect(cap.err.join('\n')).toContain('Provider is required');
  });

  it('errors on unknown provider', async () => {
    const { launchCommand } = await import('../src/cli/commands/launch.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      expectExit(() => launchCommand({
        provider: 'bogus', update: false, list: false, listCustom: false, status: false, removeKey: false, addCustom: false, setDefault: false, clean: false, noLaunch: false, dryRun: false, version: false, help: false,
      }, getDefaultConfig()), 1);
    } finally {
      cap.restore();
    }
    expect(cap.err.join('\n')).toContain('Unknown provider');
  });

  it('errors when no API key is set', async () => {
    const { launchCommand } = await import('../src/cli/commands/launch.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      expectExit(() => launchCommand({
        provider: 'zai', update: false, list: false, listCustom: false, status: false, removeKey: false, addCustom: false, setDefault: false, clean: false, noLaunch: false, dryRun: false, version: false, help: false,
      }, getDefaultConfig()), 1);
    } finally {
      cap.restore();
    }
    expect(cap.err.join('\n')).toContain('No API key');
  });

  it('errors when specified model is not available', async () => {
    const { launchCommand } = await import('../src/cli/commands/launch.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { setKey } = await import('../src/core/keys.js');
    setKey('zai', 'sk-x');
    const cap = captureIO();
    try {
      expectExit(() => launchCommand({
        provider: 'zai', model: 'NOT-REAL', update: false, list: false, listCustom: false, status: false, removeKey: false, addCustom: false, setDefault: false, clean: false, noLaunch: false, dryRun: false, version: false, help: false,
      }, getDefaultConfig()), 1);
    } finally {
      cap.restore();
    }
    expect(cap.err.join('\n')).toContain('not available');
  });

  it('dry-run prints session JSON and does not launch', async () => {
    const { launchCommand } = await import('../src/cli/commands/launch.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { setKey } = await import('../src/core/keys.js');
    setKey('zai', 'sk-abc');
    const cap = captureIO();
    try {
      launchCommand({
        provider: 'zai', apikey: 'sk-new', dryRun: true,
        update: false, list: false, listCustom: false, status: false, removeKey: false, addCustom: false, setDefault: false, clean: false, noLaunch: false, version: false, help: false,
      }, getDefaultConfig());
    } finally {
      cap.restore();
    }
    const out = cap.out.join('\n');
    expect(out).toContain('ANTHROPIC_AUTH_TOKEN');
    expect(out).toContain('ANTHROPIC_BASE_URL');
  });

  it('no-launch writes session file and prints hint', async () => {
    const { launchCommand } = await import('../src/cli/commands/launch.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { setKey } = await import('../src/core/keys.js');
    setKey('zai', 'sk');
    const cap = captureIO();
    try {
      launchCommand({
        provider: 'zai', noLaunch: true,
        update: false, list: false, listCustom: false, status: false, removeKey: false, addCustom: false, setDefault: false, clean: false, dryRun: false, version: false, help: false,
      }, getDefaultConfig());
    } finally {
      cap.restore();
    }
    const out = cap.out.join('\n');
    expect(out).toContain('Session created');
    expect(out).toContain('Skipping launch');
  });

  it('errors when decryption returns null', async () => {
    const { KEYS_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(KEYS_PATH, JSON.stringify({ zai: 'enc:v1:aes256gcm:garbage' }));
    const { launchCommand } = await import('../src/cli/commands/launch.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      expectExit(() => launchCommand({
        provider: 'zai',
        update: false, list: false, listCustom: false, status: false, removeKey: false, addCustom: false, setDefault: false, clean: false, noLaunch: false, dryRun: false, version: false, help: false,
      }, getDefaultConfig()), 1);
    } finally {
      cap.restore();
    }
    expect(cap.err.join('\n')).toContain('decrypt');
  });

  it('invokes launcher when not dry/no-launch', async () => {
    const { launchCommand } = await import('../src/cli/commands/launch.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { setKey } = await import('../src/core/keys.js');
    const launcher = await import('../src/core/launcher.js');
    const spy = vi.spyOn(launcher, 'launchClaudeCode').mockImplementation(() => {});
    setKey('zai', 'sk');
    const cap = captureIO();
    try {
      launchCommand({
        provider: 'zai', skipDangerous: true, statusLine: false,
        update: false, list: false, listCustom: false, status: false, removeKey: false, addCustom: false, setDefault: false, clean: false, noLaunch: false, dryRun: false, version: false, help: false,
      }, getDefaultConfig());
    } finally {
      cap.restore();
    }
    expect(spy).toHaveBeenCalled();
  });
});
