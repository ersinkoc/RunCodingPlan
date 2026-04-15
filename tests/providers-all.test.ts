import { describe, it, expect } from 'vitest';
import { getBuiltinResolved, getCustomResolved, resolveProvider } from '../src/core/providers.js';
import { getDefaultConfig } from '../src/core/config.js';
import { addCustomProvider } from '../src/core/custom.js';

describe('providers filters', () => {
  it('getBuiltinResolved returns only built-in', () => {
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'x', {
      name: 'X',
      baseUrl: 'https://x',
      models: ['a'],
      defaultModel: 'a',
      addedAt: 'now',
    });
    const builtin = getBuiltinResolved(cfg);
    expect(builtin.every((p) => !p.isCustom)).toBe(true);
    expect(builtin.find((p) => p.id === 'x')).toBeUndefined();
  });

  it('getCustomResolved returns only custom', () => {
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'x', {
      name: 'X',
      baseUrl: 'https://x',
      models: ['a'],
      defaultModel: 'a',
      addedAt: 'now',
    });
    const custom = getCustomResolved(cfg);
    expect(custom.length).toBe(1);
    expect(custom[0]?.id).toBe('x');
  });

  it('resolveProvider preserves config default when valid', () => {
    const cfg = getDefaultConfig();
    const zai = cfg.providers['zai'];
    if (zai) zai.defaultModel = 'glm-5';
    const p = resolveProvider('zai', cfg);
    expect(p?.defaultModel).toBe('glm-5');
  });

  it('resolveProvider falls back to builtin default when config default is invalid', () => {
    const cfg = getDefaultConfig();
    const zai = cfg.providers['zai'];
    if (zai) zai.defaultModel = 'not-a-model';
    const p = resolveProvider('zai', cfg);
    expect(p?.defaultModel).toBe('glm-5.1');
  });

  it('resolveProvider handles missing provider config for built-in', () => {
    const cfg = getDefaultConfig();
    delete cfg.providers['zai'];
    const p = resolveProvider('zai', cfg);
    expect(p?.defaultModel).toBe('glm-5.1');
    expect(p?.userModels).toEqual([]);
  });
});
