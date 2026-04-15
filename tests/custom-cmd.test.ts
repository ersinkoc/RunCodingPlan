import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeTmpHome, type TmpHome } from './helpers/tmpHome.js';
import { captureIO } from './helpers/captureIO.js';
import type { ParsedArgs } from '../src/types.js';

let tmp: TmpHome;

beforeEach(() => {
  tmp = makeTmpHome();
});
afterEach(() => {
  tmp.cleanup();
  vi.restoreAllMocks();
});

function baseArgs(over: Partial<ParsedArgs> = {}): ParsedArgs {
  return {
    update: false, list: false, listCustom: false, status: false, removeKey: false, addCustom: false, setDefault: false, clean: false, noLaunch: false, dryRun: false, version: false, help: false,
    ...over,
  };
}

function expectExit(fn: () => void | Promise<void>, code: number): () => Promise<void> {
  return async () => {
    const spy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => {
      throw new Error(`EXIT_${c}`);
    }) as never);
    try {
      await expect(async () => await fn()).rejects.toThrow(new RegExp(`EXIT_${code}`));
    } finally {
      spy.mockRestore();
    }
  };
}

describe('addCustomCommand (flag path)', () => {
  it('adds custom provider when all flags present', async () => {
    const { addCustomCommand } = await import('../src/cli/commands/custom.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    const cap = captureIO();
    try {
      await addCustomCommand(baseArgs({
        name: 'DeepSeek', url: 'https://api.deepseek.com/anthropic', apikey: 'sk', model: 'ds',
      }), cfg);
    } finally {
      cap.restore();
    }
    expect(Object.keys(cfg.customProviders).length).toBe(1);
  });

  it('flag path: validation error → exit 1', async () => {
    const { addCustomCommand } = await import('../src/cli/commands/custom.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await expectExit(() => addCustomCommand(baseArgs({
        name: '!!!', url: 'https://x', apikey: 'sk', model: 'm',
      }), getDefaultConfig()), 1)();
    } finally {
      cap.restore();
    }
  });

  it('interactive path: adds provider with single model and launches', async () => {
    const interactive = await import('../src/cli/interactive.js');
    vi.spyOn(interactive, 'input').mockImplementation(async (q: string) => {
      if (q.startsWith('Provider name')) return 'X';
      if (q.startsWith('Base URL')) return 'https://x';
      if (q.startsWith('Paste your API key')) return 'sk';
      if (q.startsWith('Model name')) return 'm';
      return '';
    });
    vi.spyOn(interactive, 'confirm').mockResolvedValue(false);
    const launcher = await import('../src/core/launcher.js');
    vi.spyOn(launcher, 'launchClaudeCode').mockImplementation(() => {});

    const { addCustomCommand } = await import('../src/cli/commands/custom.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    const cap = captureIO();
    try {
      await addCustomCommand(baseArgs(), cfg);
    } finally {
      cap.restore();
    }
    expect(Object.keys(cfg.customProviders).length).toBe(1);
  });

  it('interactive path: blank name → exit 1', async () => {
    const interactive = await import('../src/cli/interactive.js');
    vi.spyOn(interactive, 'input').mockResolvedValue('   ');
    const { addCustomCommand } = await import('../src/cli/commands/custom.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await expectExit(() => addCustomCommand(baseArgs(), getDefaultConfig()), 1)();
    } finally {
      cap.restore();
    }
  });

  it('interactive path: blank apikey → exit 1', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const calls: string[] = [];
    vi.spyOn(interactive, 'input').mockImplementation(async (q: string) => {
      calls.push(q);
      if (q.startsWith('Provider name')) return 'X';
      if (q.startsWith('Base URL')) return 'https://x';
      return '';
    });
    const { addCustomCommand } = await import('../src/cli/commands/custom.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await expectExit(() => addCustomCommand(baseArgs(), getDefaultConfig()), 1)();
    } finally {
      cap.restore();
    }
  });

  it('interactive path: two models then selects default', async () => {
    const interactive = await import('../src/cli/interactive.js');
    let modelTurns = 0;
    vi.spyOn(interactive, 'input').mockImplementation(async (q: string) => {
      if (q.startsWith('Provider name')) return 'Y';
      if (q.startsWith('Base URL')) return 'https://y';
      if (q.startsWith('Paste your API key')) return 'sk';
      if (q.startsWith('Model name')) {
        modelTurns++;
        return modelTurns === 1 ? 'a' : modelTurns === 2 ? 'b' : '';
      }
      return '';
    });
    let confirmTurns = 0;
    vi.spyOn(interactive, 'confirm').mockImplementation(async () => {
      confirmTurns++;
      // yes -> add another -> yes -> stop after b, then launch=false
      if (confirmTurns === 1) return true;
      return false;
    });
    vi.spyOn(interactive, 'select').mockResolvedValue('b');
    const { addCustomCommand } = await import('../src/cli/commands/custom.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    const cap = captureIO();
    try {
      await addCustomCommand(baseArgs(), cfg);
    } finally {
      cap.restore();
    }
    const cust = Object.values(cfg.customProviders)[0];
    expect(cust?.defaultModel).toBe('b');
    expect(cust?.models).toEqual(['a', 'b']);
  });

  it('interactive path: duplicate model entries dedupe', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const inputs = ['X', 'https://x', 'sk', 'm', 'm', ''];
    let i = 0;
    vi.spyOn(interactive, 'input').mockImplementation(async () => inputs[i++] ?? '');
    let confirmTurns = 0;
    vi.spyOn(interactive, 'confirm').mockImplementation(async () => {
      confirmTurns++;
      return confirmTurns < 3; // add another, then no, launch=no
    });
    const { addCustomCommand } = await import('../src/cli/commands/custom.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    const cap = captureIO();
    try {
      await addCustomCommand(baseArgs(), cfg);
    } finally {
      cap.restore();
    }
    const cust = Object.values(cfg.customProviders)[0];
    expect(cust?.models).toEqual(['m']);
  });
});

describe('removeCustomCommand', () => {
  it('errors when provider does not exist', async () => {
    const { removeCustomCommand } = await import('../src/cli/commands/custom.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await expectExit(() => removeCustomCommand('nope', getDefaultConfig()), 1)();
    } finally {
      cap.restore();
    }
  });

  it('removes existing custom provider', async () => {
    const { removeCustomCommand } = await import('../src/cli/commands/custom.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'x', {
      name: 'X', baseUrl: 'https://x', models: ['a'], defaultModel: 'a', addedAt: 'now',
    });
    const cap = captureIO();
    try {
      removeCustomCommand('x', cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.customProviders['x']).toBeUndefined();
  });
});
