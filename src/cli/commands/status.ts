import type { WhichCCConfig } from '../../types.js';
import { resolveAllProviders } from '../../core/providers.js';
import { hasKey } from '../../core/keys.js';
import { listSessionFiles } from '../../core/session.js';
import { CONFIG_PATH, KEYS_PATH, REGISTRY_CACHE_PATH } from '../../constants.js';
import { c } from '../ui.js';
import { existsSync } from 'node:fs';

export function statusCommand(config: WhichCCConfig): void {
  console.log('');
  console.log('  ' + c.bold('WhichClaude Status'));
  console.log('');
  console.log(`  ${c.dim('Config:')}   ${CONFIG_PATH}`);
  console.log(`  ${c.dim('Keys:')}     ${KEYS_PATH}`);
  console.log(`  ${c.dim('Registry:')} ${existsSync(REGISTRY_CACHE_PATH) ? REGISTRY_CACHE_PATH : c.yellow('(not cached — run -u)')}`);
  console.log('');

  if (config.lastUsed) {
    console.log(
      `  ${c.dim('Last used:')} ${c.cyan(config.lastUsed.provider)} / ${c.cyan(config.lastUsed.model)} @ ${config.lastUsed.timestamp}`,
    );
    console.log('');
  }

  const all = resolveAllProviders(config);
  console.log('  ' + c.bold('Providers'));
  for (const p of all) {
    const tag = p.isCustom ? c.magenta('[custom]') : c.blue('[built-in]');
    const key = hasKey(p.id) ? c.green('✓ key') : c.yellow('⚠ no key');
    const userCount =
      p.userModels.length > 0 && !p.isCustom
        ? ` ${c.yellow(`+${p.userModels.length} user model${p.userModels.length === 1 ? '' : 's'}`)}`
        : '';
    console.log(
      `    ${tag} ${c.cyan(p.id.padEnd(12))} → ${p.defaultModel.padEnd(24)} ${key}${userCount}`,
    );
  }
  console.log('');

  const sessions = listSessionFiles();
  console.log(`  ${c.dim('Session files:')} ${sessions.length}`);
  for (const s of sessions.slice(0, 5)) {
    console.log(`    ${c.dim('•')} ${s}`);
  }
  if (sessions.length > 5) {
    console.log(`    ${c.dim(`... +${sessions.length - 5} more`)}`);
  }
  console.log('');
}
