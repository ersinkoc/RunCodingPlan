import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { TEMPLATE_PATH, DEFAULT_TIMEOUT_MS } from '../constants.js';

const DEFAULT_TEMPLATE_OBJECT = {
  env: {
    ANTHROPIC_BASE_URL: '[[PROVIDER_URL]]',
    ANTHROPIC_AUTH_TOKEN: '[[APIKEY]]',
    API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
    CLAUDE_CODE_NO_FLICKER: '1',
    ANTHROPIC_MODEL: '[[MODEL]]',
    ANTHROPIC_SMALL_FAST_MODEL: '[[MODEL]]',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: '[[MODEL]]',
    ANTHROPIC_DEFAULT_SONNET_MODEL: '[[MODEL]]',
    ANTHROPIC_DEFAULT_OPUS_MODEL: '[[MODEL]]',
  },
  statusLine: {
    type: 'command',
    command: '[[STATUSLINE_COMMAND]]',
    padding: 0,
  },
};

export interface TemplateVars {
  providerUrl: string;
  apiKey: string;
  model: string;
  statusLineCommand: string;
  includeStatusLine: boolean;
}

export function getDefaultTemplate(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_OBJECT)) as Record<string, unknown>;
}

export function loadTemplate(): Record<string, unknown> {
  if (existsSync(TEMPLATE_PATH)) {
    try {
      const raw = readFileSync(TEMPLATE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // malformed file — fall back to default
    }
  }
  return getDefaultTemplate();
}

export function applyTemplate(
  template: Record<string, unknown>,
  vars: TemplateVars,
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(template)) as Record<string, unknown>;
  walkAndReplace(clone, vars);
  if (!vars.includeStatusLine && 'statusLine' in clone) {
    delete (clone as { statusLine?: unknown }).statusLine;
  }
  return clone;
}

function walkAndReplace(obj: unknown, vars: TemplateVars): void {
  if (!obj || typeof obj !== 'object') return;
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const v = record[key];
    if (typeof v === 'string') {
      record[key] = substituteString(v, vars);
    } else if (v && typeof v === 'object') {
      walkAndReplace(v, vars);
    }
  }
}

function substituteString(s: string, vars: TemplateVars): string {
  return s
    .replace(/\[\[PROVIDER_URL\]\]/g, vars.providerUrl)
    .replace(/\[\[APIKEY\]\]/g, vars.apiKey)
    .replace(/\[\[MODEL\]\]/g, vars.model)
    .replace(/\[\[STATUSLINE_COMMAND\]\]/g, vars.statusLineCommand);
}

export function writeTemplate(content: Record<string, unknown> = getDefaultTemplate()): string {
  mkdirSync(dirname(TEMPLATE_PATH), { recursive: true });
  writeFileSync(TEMPLATE_PATH, JSON.stringify(content, null, 2), 'utf8');
  return TEMPLATE_PATH;
}

export function hasCustomTemplate(): boolean {
  return existsSync(TEMPLATE_PATH);
}

export function readRawTemplate(): string | null {
  if (!existsSync(TEMPLATE_PATH)) return null;
  try {
    return readFileSync(TEMPLATE_PATH, 'utf8');
  } catch {
    return null;
  }
}
