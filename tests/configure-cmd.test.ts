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

describe('addModelCommand', () => {
  it('errors on missing args', async () => {
    const { addModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      expectExit(() => addModelCommand(baseArgs(), getDefaultConfig()), 1);
    } finally {
      cap.restore();
    }
  });

  it('errors on unknown provider', async () => {
    const { addModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      expectExit(() => addModelCommand(baseArgs({ provider: 'bogus', addModel: 'x' }), getDefaultConfig()), 1);
    } finally {
      cap.restore();
    }
  });

  it('adds to built-in provider with setDefault', async () => {
    const { addModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    const cap = captureIO();
    try {
      addModelCommand(baseArgs({ provider: 'zai', addModel: 'glm-X', setDefault: true }), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.providers['zai']?.userModels).toContain('glm-X');
    expect(cfg.providers['zai']?.defaultModel).toBe('glm-X');
  });

  it('adds to custom provider', async () => {
    const { addModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'c', {
      name: 'C', baseUrl: 'https://c', models: ['a'], defaultModel: 'a', addedAt: 'now',
    });
    const cap = captureIO();
    try {
      addModelCommand(baseArgs({ provider: 'c', addModel: 'b', setDefault: true }), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.customProviders['c']?.models).toContain('b');
    expect(cfg.customProviders['c']?.defaultModel).toBe('b');
  });
});

describe('removeModelCommand', () => {
  it('errors on missing args', async () => {
    const { removeModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    expectExit(() => removeModelCommand(baseArgs(), getDefaultConfig()), 1);
  });

  it('errors when model is not user-added', async () => {
    const { removeModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      expectExit(() => removeModelCommand(baseArgs({ provider: 'zai', removeModel: 'glm-5' }), getDefaultConfig()), 1);
    } finally {
      cap.restore();
    }
  });

  it('removes user-added model from built-in', async () => {
    const { removeModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig, addUserModel } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    addUserModel(cfg, 'zai', 'mY', false);
    const cap = captureIO();
    try {
      removeModelCommand(baseArgs({ provider: 'zai', removeModel: 'mY' }), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.providers['zai']?.userModels).not.toContain('mY');
  });

  it('errors on unknown provider', async () => {
    const { removeModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      expectExit(() => removeModelCommand(baseArgs({ provider: 'nope', removeModel: 'x' }), getDefaultConfig()), 1);
    } finally {
      cap.restore();
    }
  });

  it('removes from custom provider', async () => {
    const { removeModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'c', {
      name: 'C', baseUrl: 'https://c', models: ['a', 'b'], defaultModel: 'a', addedAt: 'now',
    });
    const cap = captureIO();
    try {
      removeModelCommand(baseArgs({ provider: 'c', removeModel: 'b' }), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.customProviders['c']?.models).toEqual(['a']);
  });

  it('errors when removing from custom fails', async () => {
    const { removeModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'c', {
      name: 'C', baseUrl: 'https://c', models: ['a'], defaultModel: 'a', addedAt: 'now',
    });
    const cap = captureIO();
    try {
      expectExit(() => removeModelCommand(baseArgs({ provider: 'c', removeModel: 'a' }), cfg), 1);
    } finally {
      cap.restore();
    }
  });
});

describe('setApiKeyCommand', () => {
  it('errors on missing args', async () => {
    const { setApiKeyCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    expectExit(() => setApiKeyCommand(baseArgs(), getDefaultConfig()), 1);
  });

  it('errors on unknown provider', async () => {
    const { setApiKeyCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      expectExit(() => setApiKeyCommand(baseArgs({ provider: 'nope', apikey: 'k' }), getDefaultConfig()), 1);
    } finally {
      cap.restore();
    }
  });

  it('saves key for valid provider', async () => {
    const { setApiKeyCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { hasKey } = await import('../src/core/keys.js');
    const cap = captureIO();
    try {
      setApiKeyCommand(baseArgs({ provider: 'zai', apikey: 'sk' }), getDefaultConfig());
    } finally {
      cap.restore();
    }
    expect(hasKey('zai')).toBe(true);
  });
});

describe('removeApiKeyCommand', () => {
  it('errors on missing provider', async () => {
    const { removeApiKeyCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    expectExit(() => removeApiKeyCommand(baseArgs(), getDefaultConfig()), 1);
  });

  it('errors on unknown provider', async () => {
    const { removeApiKeyCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      expectExit(() => removeApiKeyCommand(baseArgs({ provider: 'nope' }), getDefaultConfig()), 1);
    } finally {
      cap.restore();
    }
  });

  it('reports "No API key set" when no key exists', async () => {
    const { removeApiKeyCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      removeApiKeyCommand(baseArgs({ provider: 'zai' }), getDefaultConfig());
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toContain('No API key');
  });

  it('removes key when present', async () => {
    const { removeApiKeyCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { setKey, hasKey } = await import('../src/core/keys.js');
    setKey('zai', 'sk');
    const cap = captureIO();
    try {
      removeApiKeyCommand(baseArgs({ provider: 'zai' }), getDefaultConfig());
    } finally {
      cap.restore();
    }
    expect(hasKey('zai')).toBe(false);
  });
});

describe('setDefaultModelCommand', () => {
  it('errors on missing args', async () => {
    const { setDefaultModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    expectExit(() => setDefaultModelCommand(baseArgs(), getDefaultConfig()), 1);
  });

  it('errors on unknown provider', async () => {
    const { setDefaultModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      expectExit(() => setDefaultModelCommand(baseArgs({ provider: 'nope', model: 'm' }), getDefaultConfig()), 1);
    } finally {
      cap.restore();
    }
  });

  it('errors when model not available', async () => {
    const { setDefaultModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      expectExit(() => setDefaultModelCommand(baseArgs({ provider: 'zai', model: 'nope' }), getDefaultConfig()), 1);
    } finally {
      cap.restore();
    }
  });

  it('sets default for built-in', async () => {
    const { setDefaultModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    const cap = captureIO();
    try {
      setDefaultModelCommand(baseArgs({ provider: 'zai', model: 'glm-5' }), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.providers['zai']?.defaultModel).toBe('glm-5');
  });

  it('creates provider config when missing', async () => {
    const { setDefaultModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    delete cfg.providers['zai'];
    const cap = captureIO();
    try {
      setDefaultModelCommand(baseArgs({ provider: 'zai', model: 'glm-5' }), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.providers['zai']?.defaultModel).toBe('glm-5');
  });

  it('sets default for custom', async () => {
    const { setDefaultModelCommand } = await import('../src/cli/commands/configure.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const { addCustomProvider } = await import('../src/core/custom.js');
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'c', {
      name: 'C', baseUrl: 'https://c', models: ['a', 'b'], defaultModel: 'a', addedAt: 'now',
    });
    const cap = captureIO();
    try {
      setDefaultModelCommand(baseArgs({ provider: 'c', model: 'b' }), cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.customProviders['c']?.defaultModel).toBe('b');
  });
});
