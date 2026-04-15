import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { makeTmpHome, type TmpHome } from './helpers/tmpHome.js';
import { mkdirSync, writeFileSync } from 'node:fs';

let tmp: TmpHome;

beforeEach(() => {
  tmp = makeTmpHome();
});
afterEach(() => {
  tmp.cleanup();
});

describe('registry cache', () => {
  it('loadCachedRegistry returns null when missing', async () => {
    const { loadCachedRegistry } = await import('../src/core/registry.js');
    expect(loadCachedRegistry()).toBeNull();
  });

  it('loadCachedRegistry returns null on invalid JSON', async () => {
    const { REGISTRY_CACHE_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(REGISTRY_CACHE_PATH, '{{nope');
    const { loadCachedRegistry } = await import('../src/core/registry.js');
    expect(loadCachedRegistry()).toBeNull();
  });

  it('loadCachedRegistry returns null on invalid schema', async () => {
    const { REGISTRY_CACHE_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(REGISTRY_CACHE_PATH, JSON.stringify({ foo: 'bar' }));
    const { loadCachedRegistry } = await import('../src/core/registry.js');
    expect(loadCachedRegistry()).toBeNull();
  });

  it('loadCachedRegistry returns parsed registry when valid', async () => {
    const { REGISTRY_CACHE_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(
      REGISTRY_CACHE_PATH,
      JSON.stringify({
        version: 9,
        updatedAt: '2026-01-01',
        providers: {
          zai: {
            id: 'zai',
            name: 'ZAI',
            baseUrl: 'https://x',
            defaultModel: 'm',
            models: [{ id: 'm' }],
          },
        },
      }),
    );
    const { loadCachedRegistry, getBuiltinProvider, getAllBuiltinProviders } = await import(
      '../src/core/registry.js'
    );
    expect(loadCachedRegistry()?.version).toBe(9);
    expect(getBuiltinProvider('zai')?.defaultModel).toBe('m');
    const all = getAllBuiltinProviders();
    expect(all.find((p) => p.id === 'zai')).toBeDefined();
    expect(all.find((p) => p.id === 'kimi')).toBeDefined();
  });

  it('getBuiltinProvider returns undefined for unknown', async () => {
    const { getBuiltinProvider } = await import('../src/core/registry.js');
    expect(getBuiltinProvider('nope')).toBeUndefined();
  });

  it('preserves local affiliateUrl when cache does not carry it', async () => {
    const { REGISTRY_CACHE_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(
      REGISTRY_CACHE_PATH,
      JSON.stringify({
        version: 1,
        updatedAt: '2026-01-01',
        providers: {
          zai: {
            id: 'zai',
            name: 'ZAI',
            baseUrl: 'https://x',
            defaultModel: 'm',
            models: [{ id: 'm' }],
          },
        },
      }),
    );
    const { getBuiltinProvider, getAllBuiltinProviders } = await import(
      '../src/core/registry.js'
    );
    expect(getBuiltinProvider('zai')?.affiliateUrl).toContain('bit.ly/');
    const all = getAllBuiltinProviders();
    expect(all.find((p) => p.id === 'zai')?.affiliateUrl).toContain('bit.ly/');
    expect(all.find((p) => p.id === 'minimax')?.affiliateUrl).toContain('bit.ly/');
  });

  it('cache affiliateUrl wins when present (rotatable via registry)', async () => {
    const { REGISTRY_CACHE_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(
      REGISTRY_CACHE_PATH,
      JSON.stringify({
        version: 1,
        updatedAt: '2026-01-01',
        providers: {
          zai: {
            id: 'zai',
            name: 'ZAI',
            baseUrl: 'https://x',
            defaultModel: 'm',
            affiliateUrl: 'https://z.ai/subscribe?ic=ROTATED',
            models: [{ id: 'm' }],
          },
        },
      }),
    );
    const { getBuiltinProvider } = await import('../src/core/registry.js');
    expect(getBuiltinProvider('zai')?.affiliateUrl).toBe('https://z.ai/subscribe?ic=ROTATED');
  });

  it('isValidRegistry rejects non-string providers and non-array models', async () => {
    const { isValidRegistry } = await import('../src/core/registry.js');
    expect(
      isValidRegistry({
        version: 1,
        updatedAt: 'x',
        providers: { zai: { name: 1, baseUrl: 'x', defaultModel: 'm', models: [] } },
      }),
    ).toBe(false);
    expect(
      isValidRegistry({
        version: 1,
        updatedAt: 'x',
        providers: { zai: { name: 'x', baseUrl: 'x', defaultModel: 'm', models: 'nope' } },
      }),
    ).toBe(false);
    expect(
      isValidRegistry({
        version: 1,
        updatedAt: 'x',
        providers: { zai: null },
      }),
    ).toBe(false);
    expect(
      isValidRegistry({
        version: 1,
        updatedAt: 'x',
        providers: { zai: { name: 'x', baseUrl: 1, defaultModel: 'm', models: [] } },
      }),
    ).toBe(false);
    expect(
      isValidRegistry({
        version: 1,
        updatedAt: 'x',
        providers: { zai: { name: 'x', baseUrl: 'x', defaultModel: 1, models: [] } },
      }),
    ).toBe(false);
    expect(
      isValidRegistry({
        version: 1,
        providers: {},
      }),
    ).toBe(false);
    expect(
      isValidRegistry({
        version: 1,
        updatedAt: 'x',
        providers: null,
      }),
    ).toBe(false);
  });
});
