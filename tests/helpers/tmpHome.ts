import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';

export interface TmpHome {
  root: string;
  claudeDir: string;
  cleanup: () => void;
}

export function makeTmpHome(): TmpHome {
  const root = mkdtempSync(join(tmpdir(), 'whichclaude-test-'));
  process.env['WHICHCLAUDE_HOME_DIR'] = root;
  vi.resetModules();
  return {
    root,
    claudeDir: join(root, '.claude'),
    cleanup: () => {
      try {
        if (existsSync(root)) rmSync(root, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
      delete process.env['WHICHCLAUDE_HOME_DIR'];
      vi.resetModules();
    },
  };
}
