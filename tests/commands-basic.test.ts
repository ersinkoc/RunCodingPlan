import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeTmpHome, type TmpHome } from './helpers/tmpHome.js';
import { captureIO, captureExit } from './helpers/captureIO.js';
import { mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';

let tmp: TmpHome;

beforeEach(() => {
  tmp = makeTmpHome();
});
afterEach(() => {
  tmp.cleanup();
});

describe('listCommand', () => {
  it('prints all providers with built-in and custom sections', async () => {
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const { setKey } = await import('../src/core/keys.js');
    const { addUserModel } = await import('../src/core/config.js');
    const { listCommand } = await import('../src/cli/commands/list.js');

    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'cust', {
      name: 'Cust',
      baseUrl: 'https://c',
      models: ['m1', 'm2'],
      defaultModel: 'm1',
      addedAt: 'now',
    });
    setKey('zai', 'sk');
    addUserModel(cfg, 'zai', 'glm-6', false);

    const cap = captureIO();
    try {
      listCommand(cfg, false);
    } finally {
      cap.restore();
    }
    const out = cap.out.join('\n');
    expect(out).toContain('Built-in Providers');
    expect(out).toContain('Custom Providers');
    expect(out).toContain('Cust');
    expect(out).toContain('zai');
    expect(out).toContain('(*) = user-added');
  });

  it('onlyCustom mode hides built-in section', async () => {
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const { listCommand } = await import('../src/cli/commands/list.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'c1', {
      name: 'C1',
      baseUrl: 'https://c',
      models: ['m'],
      defaultModel: 'm',
      addedAt: 'now',
    });
    const cap = captureIO();
    try {
      listCommand(cfg, true);
    } finally {
      cap.restore();
    }
    const out = cap.out.join('\n');
    expect(out).toContain('Custom Providers');
    expect(out).not.toContain('Built-in Providers');
  });

  it('prints "No providers available" when empty list', async () => {
    const { listCommand } = await import('../src/cli/commands/list.js');
    const cfg = { providers: {}, customProviders: {}, defaults: { skipDangerous: false, statusLine: true, statusLineCommand: 'x' } } as never;
    const cap = captureIO();
    try {
      listCommand(cfg, true);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toContain('No providers available');
  });
});

describe('statusCommand', () => {
  it('prints configuration paths and provider status', async () => {
    const { getDefaultConfig, setLastUsed } = await import('../src/core/config.js');
    const { setKey } = await import('../src/core/keys.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const { writeSessionFile, buildSessionSettings } = await import('../src/core/session.js');
    const { statusCommand } = await import('../src/cli/commands/status.js');

    const cfg = getDefaultConfig();
    setKey('zai', 'sk');
    addCustomProvider(cfg, 'c', {
      name: 'C',
      baseUrl: 'https://c',
      models: ['m'],
      defaultModel: 'm',
      addedAt: 'now',
    });
    setLastUsed(cfg, 'zai', 'glm-5.1');
    const settings = buildSessionSettings('u', 'k', 'm', { statusLine: false, statusLineCommand: 'x' });
    for (let i = 0; i < 7; i++) writeSessionFile(`p${i}`, settings);

    const cap = captureIO();
    try {
      statusCommand(cfg);
    } finally {
      cap.restore();
    }
    const out = cap.out.join('\n');
    expect(out).toContain('WhichClaude Status');
    expect(out).toContain('Last used:');
    expect(out).toContain('Session files:');
    expect(out).toContain('more');
  });

  it('prints "not cached" when registry missing', async () => {
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { statusCommand } = await import('../src/cli/commands/status.js');
    const cfg = getDefaultConfig();
    const cap = captureIO();
    try {
      statusCommand(cfg);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toContain('not cached');
  });
});

describe('cleanCommand', () => {
  it('reports "No stale session files" when none match', async () => {
    const { cleanCommand } = await import('../src/cli/commands/clean.js');
    const cap = captureIO();
    try {
      await cleanCommand(false);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toContain('No stale session files');
  });

  it('removes stale session files (default mode)', async () => {
    const { CLAUDE_DIR } = await import('../src/constants.js');
    mkdirSync(CLAUDE_DIR, { recursive: true });
    const stale = join(CLAUDE_DIR, 'whichclaude-x-1.json');
    writeFileSync(stale, '{}');
    const past = (Date.now() - 48 * 60 * 60 * 1000) / 1000;
    utimesSync(stale, past, past);
    const { cleanCommand } = await import('../src/cli/commands/clean.js');
    const cap = captureIO();
    try {
      await cleanCommand(false);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toContain('Removed 1');
  });

  it('all=true: "No session files to clean" when dir empty', async () => {
    const { cleanCommand } = await import('../src/cli/commands/clean.js');
    const cap = captureIO();
    try {
      await cleanCommand(true);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toContain('No session files');
  });

  it('all=true: confirm=no → cancels', async () => {
    const { CLAUDE_DIR } = await import('../src/constants.js');
    mkdirSync(CLAUDE_DIR, { recursive: true });
    writeFileSync(join(CLAUDE_DIR, 'whichclaude-a-1.json'), '{}');
    const interactive = await import('../src/cli/interactive.js');
    vi.spyOn(interactive, 'confirm').mockResolvedValue(false);
    const { cleanCommand } = await import('../src/cli/commands/clean.js');
    const cap = captureIO();
    try {
      await cleanCommand(true);
    } finally {
      cap.restore();
      vi.restoreAllMocks();
    }
    expect(cap.out.join('\n')).toContain('Cancelled');
  });

  it('all=true: confirm=yes → removes files', async () => {
    const { CLAUDE_DIR } = await import('../src/constants.js');
    mkdirSync(CLAUDE_DIR, { recursive: true });
    const f = join(CLAUDE_DIR, 'whichclaude-b-1.json');
    writeFileSync(f, '{}');
    const interactive = await import('../src/cli/interactive.js');
    vi.spyOn(interactive, 'confirm').mockResolvedValue(true);
    const { cleanCommand } = await import('../src/cli/commands/clean.js');
    const cap = captureIO();
    try {
      await cleanCommand(true);
    } finally {
      cap.restore();
      vi.restoreAllMocks();
    }
    expect(cap.out.join('\n')).toContain('Removed 1');
  });
});
