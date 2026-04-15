import { describe, it, expect } from 'vitest';
import {
  updateCustomProvider,
  addModelToCustomProvider,
  removeModelFromCustomProvider,
  validateCustomProviderInput,
} from '../src/core/custom.js';
import { getDefaultConfig } from '../src/core/config.js';

describe('updateCustomProvider', () => {
  it('no-op on missing provider', () => {
    const cfg = getDefaultConfig();
    const r = updateCustomProvider(cfg, 'x', { baseUrl: 'https://new' });
    expect(r.customProviders['x']).toBeUndefined();
  });

  it('merges patch into existing custom provider', () => {
    const cfg = getDefaultConfig();
    cfg.customProviders['x'] = {
      name: 'X',
      baseUrl: 'https://old',
      models: ['a'],
      defaultModel: 'a',
      addedAt: 'now',
    };
    updateCustomProvider(cfg, 'x', { baseUrl: 'https://new', name: 'X2' });
    expect(cfg.customProviders['x']?.baseUrl).toBe('https://new');
    expect(cfg.customProviders['x']?.name).toBe('X2');
    expect(cfg.customProviders['x']?.models).toEqual(['a']);
  });
});

describe('addModelToCustomProvider edge cases', () => {
  it('no-op on missing provider', () => {
    const cfg = getDefaultConfig();
    addModelToCustomProvider(cfg, 'nope', 'm', true);
    expect(cfg.customProviders['nope']).toBeUndefined();
  });

  it('does not duplicate existing model', () => {
    const cfg = getDefaultConfig();
    cfg.customProviders['x'] = {
      name: 'X',
      baseUrl: 'https://x',
      models: ['a'],
      defaultModel: 'a',
      addedAt: 'now',
    };
    addModelToCustomProvider(cfg, 'x', 'a', false);
    expect(cfg.customProviders['x']?.models).toEqual(['a']);
  });

  it('updates defaultModel when removing current default leaves others', () => {
    const cfg = getDefaultConfig();
    cfg.customProviders['x'] = {
      name: 'X',
      baseUrl: 'https://x',
      models: ['a', 'b'],
      defaultModel: 'a',
      addedAt: 'now',
    };
    const { removed } = removeModelFromCustomProvider(cfg, 'x', 'a');
    expect(removed).toBe(true);
    expect(cfg.customProviders['x']?.defaultModel).toBe('b');
  });

  it('removing a non-member is noop', () => {
    const cfg = getDefaultConfig();
    cfg.customProviders['x'] = {
      name: 'X',
      baseUrl: 'https://x',
      models: ['a'],
      defaultModel: 'a',
      addedAt: 'now',
    };
    const { removed } = removeModelFromCustomProvider(cfg, 'x', 'z');
    expect(removed).toBe(false);
  });

  it('removing from missing provider is noop', () => {
    const cfg = getDefaultConfig();
    const { removed } = removeModelFromCustomProvider(cfg, 'nope', 'a');
    expect(removed).toBe(false);
  });
});

describe('validateCustomProviderInput more', () => {
  it('rejects empty name', () => {
    const r = validateCustomProviderInput({
      name: '   ',
      baseUrl: 'https://x',
      models: ['a'],
      defaultModel: 'a',
    });
    expect(r.ok).toBe(false);
  });

  it('rejects name that produces empty id', () => {
    const r = validateCustomProviderInput({
      name: '!!!',
      baseUrl: 'https://x',
      models: ['a'],
      defaultModel: 'a',
    });
    expect(r.ok).toBe(false);
  });

  it('rejects empty models', () => {
    const r = validateCustomProviderInput({
      name: 'X',
      baseUrl: 'https://x',
      models: [],
      defaultModel: 'a',
    });
    expect(r.ok).toBe(false);
  });
});
