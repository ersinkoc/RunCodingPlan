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

function mockFetch(impl: () => Response | Promise<Response>) {
  globalThis.fetch = vi.fn(impl) as unknown as typeof fetch;
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

describe('updateCommand', () => {
  it('errors on HTTP failure', async () => {
    mockFetch(() => new Response('err', { status: 500, statusText: 'Server Error' }));
    const { updateCommand } = await import('../src/cli/commands/update.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await expectExit(() => updateCommand(getDefaultConfig()), 1)();
    } finally {
      cap.restore();
    }
    expect(cap.err.join('\n')).toContain('HTTP 500');
  });

  it('errors when schema is invalid', async () => {
    mockFetch(() => new Response(JSON.stringify({ foo: 'bar' }), { status: 200 }));
    const { updateCommand } = await import('../src/cli/commands/update.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await expectExit(() => updateCommand(getDefaultConfig()), 1)();
    } finally {
      cap.restore();
    }
    expect(cap.err.join('\n')).toContain('Invalid registry');
  });

  it('errors when fetch throws', async () => {
    mockFetch(() => { throw new Error('network down'); });
    const { updateCommand } = await import('../src/cli/commands/update.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await expectExit(() => updateCommand(getDefaultConfig()), 1)();
    } finally {
      cap.restore();
    }
    expect(cap.err.join('\n')).toContain('Fetch failed');
  });

  it('caches registry and promotes user-models when present in new version', async () => {
    const reg = {
      version: 2, updatedAt: 'now',
      providers: {
        zai: { id: 'zai', name: 'ZAI', baseUrl: 'https://zai', defaultModel: 'g2', models: [{ id: 'g1' }, { id: 'g2' }] },
      },
    };
    mockFetch(() => new Response(JSON.stringify(reg), { status: 200 }));
    const { updateCommand } = await import('../src/cli/commands/update.js');
    const { getDefaultConfig, addUserModel } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    addUserModel(cfg, 'zai', 'g1', false);
    addUserModel(cfg, 'zai', 'g99', false);
    const cap = captureIO();
    try {
      await updateCommand(cfg);
    } finally {
      cap.restore();
    }
    expect(cfg.providers['zai']?.userModels).toEqual(['g99']);
  });

  it('reports "Already up to date" when cached matches', async () => {
    const reg = {
      version: 7, updatedAt: 'now',
      providers: {
        zai: { id: 'zai', name: 'ZAI', baseUrl: 'https://zai', defaultModel: 'g', models: [{ id: 'g' }] },
      },
    };
    const { REGISTRY_CACHE_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(REGISTRY_CACHE_PATH, JSON.stringify(reg));

    mockFetch(() => new Response(JSON.stringify(reg), { status: 200 }));
    const { updateCommand } = await import('../src/cli/commands/update.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await updateCommand(getDefaultConfig());
    } finally {
      cap.restore();
    }
    expect(cap.out.join('\n')).toContain('up to date');
  });

  it('prints diff: new provider, removed provider, new/removed models, default change', async () => {
    const oldReg = {
      version: 1, updatedAt: 'then',
      providers: {
        zai: { id: 'zai', name: 'ZAI', baseUrl: 'u', defaultModel: 'a', models: [{ id: 'a' }, { id: 'old' }] },
        gone: { id: 'gone', name: 'G', baseUrl: 'u', defaultModel: 'x', models: [{ id: 'x' }] },
      },
    };
    const newReg = {
      version: 2, updatedAt: 'now',
      providers: {
        zai: { id: 'zai', name: 'ZAI', baseUrl: 'u', defaultModel: 'b', models: [{ id: 'a' }, { id: 'b' }] },
        added: { id: 'added', name: 'A', baseUrl: 'u', defaultModel: 'y', models: [{ id: 'y' }] },
      },
    };
    const { REGISTRY_CACHE_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(REGISTRY_CACHE_PATH, JSON.stringify(oldReg));

    mockFetch(() => new Response(JSON.stringify(newReg), { status: 200 }));
    const { updateCommand } = await import('../src/cli/commands/update.js');
    const { getDefaultConfig } = await import('../src/core/config.js');
    const cap = captureIO();
    try {
      await updateCommand(getDefaultConfig());
    } finally {
      cap.restore();
    }
    const out = cap.out.join('\n');
    const err = cap.err.join('\n');
    expect(out).toContain('Registry updated');
    expect(out).toContain('New provider: added');
    expect(out + err).toContain('Removed provider: gone');
    expect(out).toContain('zai/b');
    expect(out).toContain('zai/old');
    expect(out).toContain('default');
  });
});
