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

function baseArgs(): ParsedArgs {
  return {
    update: false, list: false, listCustom: false, status: false, removeKey: false, addCustom: false, setDefault: false, clean: false, noLaunch: false, dryRun: false, version: false, help: false,
  };
}

describe('runInteractive', () => {
  it('exit choice returns without further action', async () => {
    const interactive = await import('../src/cli/interactive.js');
    vi.spyOn(interactive, 'select').mockResolvedValue('exit');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), getDefaultConfig());
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toContain('Hangi');
  });

  it('add-custom choice invokes addCustomCommand', async () => {
    const interactive = await import('../src/cli/interactive.js');
    vi.spyOn(interactive, 'select').mockResolvedValueOnce('add-custom').mockResolvedValue('exit');
    vi.spyOn(interactive, 'input').mockResolvedValue('');
    const custom = await import('../src/cli/commands/custom.js');
    const spy = vi.spyOn(custom, 'addCustomCommand').mockResolvedValue();
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), getDefaultConfig());
    } finally {
      cap.restore();
    }
    expect(spy).toHaveBeenCalled();
  });

  it('update choice runs updateCommand', async () => {
    const interactive = await import('../src/cli/interactive.js');
    vi.spyOn(interactive, 'select').mockResolvedValueOnce('update').mockResolvedValue('exit');
    const update = await import('../src/cli/commands/update.js');
    const spy = vi.spyOn(update, 'updateCommand').mockResolvedValue();
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), getDefaultConfig());
    } finally {
      cap.restore();
    }
    expect(spy).toHaveBeenCalled();
  });

  it('launch choice prompts for key, model, then launches', async () => {
    const interactive = await import('../src/cli/interactive.js');
    let selectCalls = 0;
    vi.spyOn(interactive, 'select').mockImplementation(async () => {
      selectCalls++;
      if (selectCalls === 1) return 'launch:zai';
      if (selectCalls === 2) return 'glm-5.1';
      return 'exit';
    });
    vi.spyOn(interactive, 'confirm').mockImplementation(async (q: string, d?: boolean) => {
      // 1st: set key? yes
      if (q.includes('Set API key')) return true;
      return d ?? false;
    });
    vi.spyOn(interactive, 'input').mockResolvedValue('sk-abc');
    const launcher = await import('../src/core/launcher.js');
    vi.spyOn(launcher, 'launchClaudeCode').mockImplementation(() => {});
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), getDefaultConfig());
    } finally {
      cap.restore();
    }
    const { hasKey } = await import('../src/core/keys.js');
    expect(hasKey('zai')).toBe(true);
  });

  it('launch choice with no key and refuse set returns early', async () => {
    const interactive = await import('../src/cli/interactive.js');
    vi.spyOn(interactive, 'select').mockResolvedValueOnce('launch:zai').mockResolvedValue('exit');
    vi.spyOn(interactive, 'confirm').mockResolvedValue(false);
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), getDefaultConfig());
    } finally {
      cap.restore();
    }
    const { hasKey } = await import('../src/core/keys.js');
    expect(hasKey('zai')).toBe(false);
  });

  it('launch choice with blank input cancels key setup', async () => {
    const interactive = await import('../src/cli/interactive.js');
    vi.spyOn(interactive, 'select').mockResolvedValueOnce('launch:zai').mockResolvedValue('exit');
    vi.spyOn(interactive, 'confirm').mockResolvedValueOnce(true);
    vi.spyOn(interactive, 'input').mockResolvedValue('   ');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), getDefaultConfig());
    } finally {
      cap.restore();
    }
    const { hasKey } = await import('../src/core/keys.js');
    expect(hasKey('zai')).toBe(false);
  });

  it('launch:unknown returns silently', async () => {
    const interactive = await import('../src/cli/interactive.js');
    vi.spyOn(interactive, 'select').mockResolvedValueOnce('launch:nope').mockResolvedValue('exit');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), getDefaultConfig());
    } finally {
      cap.restore();
    }
  });

  it('shows custom providers section when custom exists', async () => {
    const interactive = await import('../src/cli/interactive.js');
    vi.spyOn(interactive, 'select').mockResolvedValue('exit');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'mine', {
      name: 'Mine', baseUrl: 'https://mine', models: ['a'], defaultModel: 'a', addedAt: 'now',
    });
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), cfg);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toContain('Custom');
  });
});

describe('interactiveConfigure (via configure choice)', () => {
  it('back returns early', async () => {
    const interactive = await import('../src/cli/interactive.js');
    let t = 0;
    vi.spyOn(interactive, 'select').mockImplementation(async () => {
      t++;
      if (t === 1) return 'configure';
      if (t === 2) return '__back__';
      return 'exit';
    });
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    await runInteractive(baseArgs(), getDefaultConfig());
  });

  it('change default model path', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'zai', 'default', 'glm-5'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.providers['zai']?.defaultModel).toBe('glm-5');
  });

  it('change default model on custom provider', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'c', 'default', 'b'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'c', {
      name: 'C', baseUrl: 'https://c', models: ['a', 'b'], defaultModel: 'a', addedAt: 'now',
    });
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.customProviders['c']?.defaultModel).toBe('b');
  });

  it('add-model on built-in (with set-as-default)', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'zai', 'add-model'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    vi.spyOn(interactive, 'input').mockResolvedValue('new-m');
    vi.spyOn(interactive, 'confirm').mockResolvedValue(true);
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.providers['zai']?.userModels).toContain('new-m');
    expect(cfg.providers['zai']?.defaultModel).toBe('new-m');
  });

  it('add-model: blank input returns early', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'zai', 'add-model'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    vi.spyOn(interactive, 'input').mockResolvedValue('');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.providers['zai']?.userModels ?? []).toEqual([]);
  });

  it('add-model on custom provider', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'c', 'add-model'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    vi.spyOn(interactive, 'input').mockResolvedValue('newmod');
    vi.spyOn(interactive, 'confirm').mockResolvedValue(false);
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'c', {
      name: 'C', baseUrl: 'https://c', models: ['a'], defaultModel: 'a', addedAt: 'now',
    });
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.customProviders['c']?.models).toContain('newmod');
  });

  it('remove-model path on user-added', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'zai', 'remove-model', 'mY'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig, addUserModel } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    addUserModel(cfg, 'zai', 'mY', false);
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.providers['zai']?.userModels).not.toContain('mY');
  });

  it('remove-model: no removable → returns early with info', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'zai', 'remove-model'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), cfg);
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toContain('No removable');
  });

  it('remove-model on custom provider', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'c', 'remove-model', 'b'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'c', {
      name: 'C', baseUrl: 'https://c', models: ['a', 'b'], defaultModel: 'a', addedAt: 'now',
    });
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.customProviders['c']?.models).toEqual(['a']);
  });

  it('update-key path', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'zai', 'update-key'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    vi.spyOn(interactive, 'input').mockResolvedValue('sk-new');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { hasKey } = await import('../src/core/keys.js');
    const cap = captureIO();
    try {
      await runInteractive(baseArgs(), getDefaultConfig());
    } finally {
      cap.restore();
    }
    expect(hasKey('zai')).toBe(true);
  });

  it('update-key: blank returns early', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'zai', 'update-key'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    vi.spyOn(interactive, 'input').mockResolvedValue('');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { hasKey } = await import('../src/core/keys.js');
    await runInteractive(baseArgs(), getDefaultConfig());
    expect(hasKey('zai')).toBe(false);
  });

  it('remove-key path: confirm yes', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'zai', 'remove-key'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    vi.spyOn(interactive, 'confirm').mockResolvedValue(true);
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { setKey, hasKey } = await import('../src/core/keys.js');
    setKey('zai', 'sk');
    await runInteractive(baseArgs(), getDefaultConfig());
    expect(hasKey('zai')).toBe(false);
  });

  it('remove-key path: confirm no returns early', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'zai', 'remove-key'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    vi.spyOn(interactive, 'confirm').mockResolvedValue(false);
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { setKey, hasKey } = await import('../src/core/keys.js');
    setKey('zai', 'sk');
    await runInteractive(baseArgs(), getDefaultConfig());
    expect(hasKey('zai')).toBe(true);
  });

  it('update-url on custom provider', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'c', 'update-url'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    vi.spyOn(interactive, 'input').mockResolvedValue('https://new');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'c', {
      name: 'C', baseUrl: 'https://c', models: ['a'], defaultModel: 'a', addedAt: 'now',
    });
    await runInteractive(baseArgs(), cfg);
    expect(cfg.customProviders['c']?.baseUrl).toBe('https://new');
  });

  it('update-url blank returns early', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'c', 'update-url'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    vi.spyOn(interactive, 'input').mockResolvedValue('');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'c', {
      name: 'C', baseUrl: 'https://c', models: ['a'], defaultModel: 'a', addedAt: 'now',
    });
    await runInteractive(baseArgs(), cfg);
    expect(cfg.customProviders['c']?.baseUrl).toBe('https://c');
  });

  it('delete custom provider: confirm yes', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'c', 'delete'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    vi.spyOn(interactive, 'confirm').mockResolvedValue(true);
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'c', {
      name: 'C', baseUrl: 'https://c', models: ['a'], defaultModel: 'a', addedAt: 'now',
    });
    await runInteractive(baseArgs(), cfg);
    expect(cfg.customProviders['c']).toBeUndefined();
  });

  it('delete custom provider: confirm no keeps provider', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'c', 'delete'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    vi.spyOn(interactive, 'confirm').mockResolvedValue(false);
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'c', {
      name: 'C', baseUrl: 'https://c', models: ['a'], defaultModel: 'a', addedAt: 'now',
    });
    await runInteractive(baseArgs(), cfg);
    expect(cfg.customProviders['c']).toBeDefined();
  });

  it('interactiveConfigure: unknown provider selected returns', async () => {
    const interactive = await import('../src/cli/interactive.js');
    const picks = ['configure', 'ghost'];
    vi.spyOn(interactive, 'select').mockImplementation(async () => picks.shift() ?? 'exit');
    const { runInteractive } = await import('../src/cli/commands/interactive-flow.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    await runInteractive(baseArgs(), getDefaultConfig());
  });
});
