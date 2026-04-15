import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { makeTmpHome, type TmpHome } from './helpers/tmpHome.js';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let tmp: TmpHome;

beforeEach(() => {
  tmp = makeTmpHome();
});
afterEach(() => {
  tmp.cleanup();
});

describe('loadConfig / saveConfig', () => {
  it('creates default config when file missing', async () => {
    const { loadConfig } = await import('../src/core/config.js');
    const cfg = loadConfig();
    expect(cfg.version).toBe(1);
    expect(cfg.providers['zai']).toBeDefined();
    const { CONFIG_PATH } = await import('../src/constants.js');
    expect(existsSync(CONFIG_PATH)).toBe(true);
  });

  it('loads an existing config', async () => {
    const { CONFIG_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify({
        version: 1,
        defaults: { skipDangerous: true, statusLine: false, statusLineCommand: 'hi' },
        providers: { zai: { defaultModel: 'glm-x', userModels: ['glm-x'] } },
        customProviders: {},
        lastUsed: null,
      }),
    );
    const { loadConfig } = await import('../src/core/config.js');
    const cfg = loadConfig();
    expect(cfg.defaults.skipDangerous).toBe(true);
    expect(cfg.defaults.statusLine).toBe(false);
    expect(cfg.providers['zai']?.defaultModel).toBe('glm-x');
  });

  it('falls back to defaults on corrupt config', async () => {
    const { CONFIG_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(CONFIG_PATH, '{{not json');
    const { loadConfig } = await import('../src/core/config.js');
    const cfg = loadConfig();
    expect(cfg.version).toBe(1);
  });

  it('saveConfig writes to disk', async () => {
    const { loadConfig, saveConfig } = await import('../src/core/config.js');
    const cfg = loadConfig();
    cfg.defaults.statusLine = false;
    saveConfig(cfg);
    const cfg2 = loadConfig();
    expect(cfg2.defaults.statusLine).toBe(false);
  });

  it('ensureDirs creates the .whichclaude dir', async () => {
    const { WHICHCC_DIR } = await import('../src/constants.js');
    const { ensureDirs } = await import('../src/core/config.js');
    ensureDirs();
    expect(existsSync(WHICHCC_DIR)).toBe(true);
    // idempotent
    ensureDirs();
    expect(existsSync(WHICHCC_DIR)).toBe(true);
  });

  it('addUserModel creates provider entry if missing', async () => {
    const { addUserModel, getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    delete cfg.providers['zai'];
    addUserModel(cfg, 'zai', 'new', true);
    expect(cfg.providers['zai']?.userModels).toEqual(['new']);
    expect(cfg.providers['zai']?.defaultModel).toBe('new');
  });

  it('addUserModel does not duplicate existing user models', async () => {
    const { addUserModel, getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    addUserModel(cfg, 'zai', 'glm-6', false);
    addUserModel(cfg, 'zai', 'glm-6', false);
    expect(cfg.providers['zai']?.userModels).toEqual(['glm-6']);
  });

  it('removeUserModel on missing provider is noop', async () => {
    const { removeUserModel, getDefaultConfig } = await import('../src/core/config.js');
    const cfg = getDefaultConfig();
    const res = removeUserModel(cfg, 'nonexistent', 'foo');
    expect(res.removed).toBe(false);
  });

  it('migrateConfig handles missing providers gracefully', async () => {
    const { migrateConfig } = await import('../src/core/config.js');
    const cfg = migrateConfig({
      version: 1,
      providers: { foo: { defaultModel: 'x', userModels: ['y'] } },
    });
    expect(cfg.providers['foo']?.userModels).toEqual(['y']);
  });

  it('migrateConfig ignores non-object providers entry', async () => {
    const { migrateConfig } = await import('../src/core/config.js');
    const cfg = migrateConfig({ version: 1, providers: { zai: null } });
    // falls back to defaults for zai
    expect(cfg.providers['zai']?.defaultModel).toBe('glm-5.1');
  });

  it('loadConfig survives when CONFIG path exists but is empty', async () => {
    const { CONFIG_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(CONFIG_PATH, '');
    const { loadConfig } = await import('../src/core/config.js');
    const cfg = loadConfig();
    expect(cfg.version).toBe(1);
  });

  it('saveConfig creates missing parent dir', async () => {
    const { CONFIG_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    // delete .whichclaude
    const { rmSync } = await import('node:fs');
    if (existsSync(WHICHCC_DIR)) rmSync(WHICHCC_DIR, { recursive: true, force: true });
    const { saveConfig, getDefaultConfig } = await import('../src/core/config.js');
    saveConfig(getDefaultConfig());
    expect(existsSync(CONFIG_PATH)).toBe(true);
  });

  it('uses WHICHCLAUDE_HOME_DIR override', async () => {
    const { CLAUDE_DIR } = await import('../src/constants.js');
    expect(CLAUDE_DIR).toBe(join(tmp.root, '.claude'));
  });
});
