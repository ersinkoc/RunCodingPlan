import type { WhichCCConfig } from '../../types.js';
import { resolveAllProviders, getBuiltinResolved, getCustomResolved } from '../../core/providers.js';
import { hasKey } from '../../core/keys.js';
import { c, footerPlug } from '../ui.js';

export function listCommand(config: WhichCCConfig, onlyCustom = false): void {
  const all = onlyCustom ? getCustomResolved(config) : resolveAllProviders(config);
  if (all.length === 0) {
    console.log('\n  ' + c.dim('No providers available.'));
    return;
  }

  console.log('');
  const builtin = onlyCustom ? [] : getBuiltinResolved(config);
  const custom = onlyCustom ? all : getCustomResolved(config);

  if (builtin.length > 0) {
    console.log('  ' + c.bold('Built-in Providers'));
    for (const p of builtin) {
      const keyStatus = hasKey(p.id) ? c.green('[API ✓]') : c.yellow('[No Key]');
      console.log(`    ${c.cyan(p.id.padEnd(10))} ${p.name} ${keyStatus}`);
      console.log(`      ${c.dim('default:')} ${p.defaultModel}`);
      for (const m of p.models) {
        const isUser = p.userModels.includes(m);
        const marker = isUser ? c.yellow(' (*)') : '';
        const isDefault = m === p.defaultModel ? c.dim(' (default)') : '';
        console.log(`      • ${m}${marker}${isDefault}`);
      }
      console.log('');
    }
    if (builtin.some((p) => p.userModels.length > 0)) {
      console.log('  ' + c.dim('(*) = user-added model'));
      console.log('');
    }
  }

  if (custom.length > 0) {
    console.log('  ' + c.bold('Custom Providers'));
    for (const p of custom) {
      const keyStatus = hasKey(p.id) ? c.green('[API ✓]') : c.yellow('[No Key]');
      console.log(`    ${c.cyan(p.id.padEnd(10))} ${p.name} ${keyStatus}`);
      console.log(`      ${c.dim('URL:')} ${p.baseUrl}`);
      console.log(`      ${c.dim('default:')} ${p.defaultModel}`);
      for (const m of p.models) {
        const isDefault = m === p.defaultModel ? c.dim(' (default)') : '';
        console.log(`      • ${m}${isDefault}`);
      }
      console.log('');
    }
  }

  console.log(footerPlug());
}
