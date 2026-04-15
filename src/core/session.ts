import { writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { SessionSettings } from '../types.js';
import { CLAUDE_DIR, SESSION_PREFIX, SESSION_MAX_AGE_MS } from '../constants.js';
import { loadTemplate, applyTemplate } from './template.js';

export interface BuildOptions {
  statusLine: boolean;
  statusLineCommand: string;
}

export function buildSessionSettings(
  baseUrl: string,
  apiKey: string,
  model: string,
  options: BuildOptions,
): SessionSettings {
  const template = loadTemplate();
  const rendered = applyTemplate(template, {
    providerUrl: baseUrl,
    apiKey,
    model,
    statusLineCommand: options.statusLineCommand,
    includeStatusLine: options.statusLine,
  });
  return rendered as SessionSettings;
}

export function writeSessionFile(providerId: string, settings: SessionSettings): string {
  if (!existsSync(CLAUDE_DIR)) mkdirSync(CLAUDE_DIR, { recursive: true });
  const filename = `${SESSION_PREFIX}${providerId}-${Date.now()}.json`;
  const path = join(CLAUDE_DIR, filename);
  writeFileSync(path, JSON.stringify(settings, null, 2), 'utf8');
  return path;
}

export function cleanOldSessions(maxAgeMs: number = SESSION_MAX_AGE_MS): string[] {
  if (!existsSync(CLAUDE_DIR)) return [];
  const removed: string[] = [];
  const now = Date.now();
  try {
    const entries = readdirSync(CLAUDE_DIR);
    for (const entry of entries) {
      if (!entry.startsWith(SESSION_PREFIX) || !entry.endsWith('.json')) continue;
      const path = join(CLAUDE_DIR, entry);
      try {
        const stat = statSync(path);
        if (now - stat.mtimeMs > maxAgeMs) {
          unlinkSync(path);
          removed.push(path);
        }
      } catch {
        // ignore per-file errors
      }
    }
  } catch {
    // ignore directory errors
  }
  return removed;
}

export function listSessionFiles(): string[] {
  if (!existsSync(CLAUDE_DIR)) return [];
  try {
    return readdirSync(CLAUDE_DIR)
      .filter((f) => f.startsWith(SESSION_PREFIX) && f.endsWith('.json'))
      .map((f) => join(CLAUDE_DIR, f));
  } catch {
    return [];
  }
}

export function removeSessionFile(path: string): boolean {
  try {
    if (existsSync(path)) {
      unlinkSync(path);
      return true;
    }
  } catch {
    // ignore — best-effort cleanup
  }
  return false;
}
