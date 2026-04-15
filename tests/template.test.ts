import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeTmpHome, type TmpHome } from './helpers/tmpHome.js';
import { captureIO } from './helpers/captureIO.js';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';

let tmp: TmpHome;

beforeEach(() => {
  tmp = makeTmpHome();
});
afterEach(() => {
  tmp.cleanup();
  vi.restoreAllMocks();
});

describe('template module', () => {
  it('loadTemplate returns default when no file exists', async () => {
    const { loadTemplate, getDefaultTemplate } = await import('../src/core/template.js');
    expect(loadTemplate()).toEqual(getDefaultTemplate());
  });

  it('loadTemplate reads user-customized file', async () => {
    const { TEMPLATE_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(TEMPLATE_PATH, JSON.stringify({ env: { FOO: 'BAR' } }));
    const { loadTemplate } = await import('../src/core/template.js');
    expect(loadTemplate()).toEqual({ env: { FOO: 'BAR' } });
  });

  it('loadTemplate falls back to default on invalid JSON', async () => {
    const { TEMPLATE_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(TEMPLATE_PATH, '{not json');
    const { loadTemplate, getDefaultTemplate } = await import('../src/core/template.js');
    expect(loadTemplate()).toEqual(getDefaultTemplate());
  });

  it('loadTemplate ignores non-object JSON', async () => {
    const { TEMPLATE_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(TEMPLATE_PATH, '[1,2,3]');
    const { loadTemplate, getDefaultTemplate } = await import('../src/core/template.js');
    expect(loadTemplate()).toEqual(getDefaultTemplate());
  });

  it('applyTemplate substitutes placeholders in nested strings', async () => {
    const { applyTemplate } = await import('../src/core/template.js');
    const out = applyTemplate(
      {
        env: {
          URL: '[[PROVIDER_URL]]',
          KEY: '[[APIKEY]]',
          NEST: { MODEL: '[[MODEL]]', CMD: '[[STATUSLINE_COMMAND]]' },
        },
      },
      {
        providerUrl: 'https://x',
        apiKey: 'sk-1',
        model: 'm-1',
        statusLineCommand: 'ccs',
        includeStatusLine: true,
      },
    );
    expect(out).toEqual({
      env: { URL: 'https://x', KEY: 'sk-1', NEST: { MODEL: 'm-1', CMD: 'ccs' } },
    });
  });

  it('applyTemplate removes statusLine when includeStatusLine is false', async () => {
    const { applyTemplate } = await import('../src/core/template.js');
    const out = applyTemplate(
      { env: {}, statusLine: { type: 'command', command: 'x', padding: 0 } },
      {
        providerUrl: 'u',
        apiKey: 'k',
        model: 'm',
        statusLineCommand: 'x',
        includeStatusLine: false,
      },
    );
    expect(out.statusLine).toBeUndefined();
  });

  it('applyTemplate keeps statusLine when includeStatusLine is true', async () => {
    const { applyTemplate } = await import('../src/core/template.js');
    const out = applyTemplate(
      { env: {}, statusLine: { type: 'command', command: '[[STATUSLINE_COMMAND]]', padding: 0 } },
      {
        providerUrl: 'u',
        apiKey: 'k',
        model: 'm',
        statusLineCommand: 'npx ccs',
        includeStatusLine: true,
      },
    );
    expect(out.statusLine).toEqual({ type: 'command', command: 'npx ccs', padding: 0 });
  });

  it('writeTemplate creates the directory and file', async () => {
    const { writeTemplate, getDefaultTemplate } = await import('../src/core/template.js');
    const { TEMPLATE_PATH } = await import('../src/constants.js');
    const p = writeTemplate(getDefaultTemplate());
    expect(p).toBe(TEMPLATE_PATH);
    expect(existsSync(TEMPLATE_PATH)).toBe(true);
    expect(JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8'))).toEqual(getDefaultTemplate());
  });

  it('hasCustomTemplate reflects file presence', async () => {
    const { hasCustomTemplate, writeTemplate } = await import('../src/core/template.js');
    expect(hasCustomTemplate()).toBe(false);
    writeTemplate();
    expect(hasCustomTemplate()).toBe(true);
  });

  it('readRawTemplate returns null when missing, string when present', async () => {
    const { readRawTemplate, writeTemplate } = await import('../src/core/template.js');
    expect(readRawTemplate()).toBeNull();
    writeTemplate({ env: { A: '1' } });
    expect(readRawTemplate()).toContain('"A"');
  });

  it('readRawTemplate handles read errors', async () => {
    const { TEMPLATE_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(TEMPLATE_PATH, '{}');
    vi.resetModules();
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      return {
        ...actual,
        readFileSync: () => {
          throw new Error('boom');
        },
      };
    });
    const { readRawTemplate } = await import('../src/core/template.js');
    expect(readRawTemplate()).toBeNull();
    vi.doUnmock('node:fs');
    vi.resetModules();
  });
});

describe('buildSessionSettings via template', () => {
  it('produces default env when no custom template', async () => {
    const { buildSessionSettings } = await import('../src/core/session.js');
    const s = buildSessionSettings('https://x', 'sk-1', 'm-1', {
      statusLine: false,
      statusLineCommand: 'npx ccs',
    });
    expect(s.env.ANTHROPIC_BASE_URL).toBe('https://x');
    expect(s.env.ANTHROPIC_AUTH_TOKEN).toBe('sk-1');
    expect(s.env.ANTHROPIC_MODEL).toBe('m-1');
    expect(s.statusLine).toBeUndefined();
  });

  it('honors custom template additions', async () => {
    const { TEMPLATE_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(
      TEMPLATE_PATH,
      JSON.stringify({
        env: {
          ANTHROPIC_BASE_URL: '[[PROVIDER_URL]]',
          ANTHROPIC_AUTH_TOKEN: '[[APIKEY]]',
          ANTHROPIC_MODEL: '[[MODEL]]',
          CUSTOM_VAR: 'user-added',
        },
      }),
    );
    const { buildSessionSettings } = await import('../src/core/session.js');
    const s = buildSessionSettings('u', 'k', 'm', {
      statusLine: false,
      statusLineCommand: 'x',
    });
    expect(s.env['CUSTOM_VAR']).toBe('user-added');
    expect(s.env.ANTHROPIC_MODEL).toBe('m');
  });
});

describe('showTemplateCommand / resetTemplateCommand', () => {
  it('showTemplate prints default when no file', async () => {
    const { showTemplateCommand } = await import('../src/cli/commands/template.js');
    const cap = captureIO();
    try {
      showTemplateCommand();
    } finally {
      cap.restore();
    }
    const out = cap.out.join('\n');
    expect(out).toContain('Session template');
    expect(out).toContain('default (built-in)');
    expect(out).toContain('[[PROVIDER_URL]]');
  });

  it('showTemplate marks user-customized source', async () => {
    const { writeTemplate, showTemplateCommand } = await import('../src/core/template.js').then(
      async (tpl) => ({
        ...tpl,
        showTemplateCommand: (await import('../src/cli/commands/template.js')).showTemplateCommand,
      }),
    );
    writeTemplate({ env: { MY_VAR: 'x' } });
    const cap = captureIO();
    try {
      showTemplateCommand();
    } finally {
      cap.restore();
    }
    const out = cap.out.join('\n');
    expect(out).toContain('user-customized');
    expect(out).toContain('MY_VAR');
  });

  it('resetTemplate writes default template', async () => {
    const { resetTemplateCommand } = await import('../src/cli/commands/template.js');
    const { TEMPLATE_PATH } = await import('../src/constants.js');
    const cap = captureIO();
    try {
      resetTemplateCommand();
    } finally {
      cap.restore();
    }
    expect(existsSync(TEMPLATE_PATH)).toBe(true);
    const parsed = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8'));
    expect(parsed.env.ANTHROPIC_MODEL).toBe('[[MODEL]]');
  });
});
