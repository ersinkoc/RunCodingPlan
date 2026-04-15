import type { ParsedArgs, WhichCCConfig } from '../../types.js';
import { resolveAllProviders, resolveProvider } from '../../core/providers.js';
import { hasKey, setKey } from '../../core/keys.js';
import { addUserModel, removeUserModel, saveConfig } from '../../core/config.js';
import {
  addModelToCustomProvider,
  removeCustomProvider,
  removeModelFromCustomProvider,
  updateCustomProvider,
} from '../../core/custom.js';
import { banner, sectionBox, footerPlug, c, success, info } from '../ui.js';
import { select, input, confirm } from '../interactive.js';
import { launchCommand } from './launch.js';
import { addCustomCommand } from './custom.js';
import { updateCommand } from './update.js';
import { VERSION } from '../../constants.js';

export async function runInteractive(
  args: ParsedArgs,
  config: WhichCCConfig,
): Promise<void> {
  console.log(banner(VERSION));
  console.log(renderProviderBox(config));
  console.log('');

  const all = resolveAllProviders(config);
  const builtin = all.filter((p) => !p.isCustom);
  const custom = all.filter((p) => p.isCustom);

  const options = [];
  for (const p of builtin) {
    const keyTag = hasKey(p.id) ? '' : ' ⚠ No API key';
    options.push({
      label: `${p.name} — ${p.defaultModel}${keyTag}`,
      value: `launch:${p.id}`,
    });
  }
  if (custom.length > 0) {
    options.push({ label: '─── Custom ───', value: '', separator: true });
    for (const p of custom) {
      const keyTag = hasKey(p.id) ? '' : ' ⚠ No API key';
      options.push({
        label: `${p.name} — ${p.defaultModel}${keyTag}`,
        value: `launch:${p.id}`,
      });
    }
  }
  options.push({ label: '─────────────', value: '', separator: true });
  options.push({ label: 'Add custom provider', value: 'add-custom' });
  options.push({ label: 'Configure a provider', value: 'configure' });
  options.push({ label: 'Update model list', value: 'update' });
  options.push({ label: 'Exit', value: 'exit' });

  const choice = await select('Select provider:', options);

  if (choice === 'exit') {
    console.log(footerPlug());
    return;
  }
  if (choice === 'add-custom') {
    await addCustomCommand(args, config);
    return;
  }
  if (choice === 'update') {
    await updateCommand(config);
    return;
  }
  if (choice === 'configure') {
    await interactiveConfigure(config);
    return;
  }
  if (choice.startsWith('launch:')) {
    const providerId = choice.slice('launch:'.length);
    await interactiveLaunch(args, config, providerId);
    return;
  }
}

function renderProviderBox(config: WhichCCConfig): string {
  const all = resolveAllProviders(config);
  const builtin = all.filter((p) => !p.isCustom);
  const custom = all.filter((p) => p.isCustom);

  const builtinRows: string[] = [];
  for (const p of builtin) {
    const icon = hasKey(p.id) ? c.green('✓') : c.yellow('⚠');
    const key = hasKey(p.id) ? c.green('[API ✓]') : c.yellow('[No Key]');
    const promo = !hasKey(p.id) && p.affiliateUrl ? ' ' + c.magenta('🎁 discount') : '';
    builtinRows.push(`${icon} ${p.name.padEnd(22)} → ${p.defaultModel.padEnd(16)} ${key}${promo}`);
  }
  if (builtinRows.length === 0) builtinRows.push(c.dim('(no built-in providers)'));

  const customRows: string[] = [];
  for (const p of custom) {
    const icon = hasKey(p.id) ? c.green('✓') : c.yellow('⚠');
    const key = hasKey(p.id) ? c.green('[API ✓]') : c.yellow('[No Key]');
    customRows.push(`${icon} ${p.name.padEnd(22)} → ${p.defaultModel.padEnd(16)} ${key}`);
  }

  const sections = [{ title: 'Built-in Providers', rows: builtinRows }];
  if (customRows.length > 0) {
    sections.push({ title: 'Custom Providers', rows: customRows });
  }
  return sectionBox(sections, 68);
}

async function interactiveLaunch(
  args: ParsedArgs,
  config: WhichCCConfig,
  providerId: string,
): Promise<void> {
  const provider = resolveProvider(providerId, config);
  if (!provider) return;

  if (!hasKey(provider.id)) {
    info(`No API key set for ${provider.name}.`);
    if (provider.affiliateUrl) {
      info(`Discount signup (affiliate): ${c.underline(provider.affiliateUrl)}`);
    } else if (provider.signupUrl) {
      info(`Get a key: ${c.underline(provider.signupUrl)}`);
    }
    const set = await confirm('Set API key now?', true);
    if (!set) return;
    const apikey = (await input('Paste your API key:', { masked: true })).trim();
    if (!apikey) return;
    setKey(provider.id, apikey);
    success(`API key saved for ${provider.name} (encrypted)`);
  }

  const modelOptions = provider.models.map((m) => {
    const isUser = provider.userModels.includes(m) && !provider.isCustom;
    const isDefault = m === provider.defaultModel;
    const marker = isUser ? ' (*)' : '';
    const defMarker = isDefault ? ' (default)' : '';
    return { label: `${m}${marker}${defMarker}`, value: m };
  });
  if (provider.userModels.length > 0 && !provider.isCustom) {
    modelOptions.push({ label: '─────────────', value: '', separator: true } as never);
    modelOptions.push({
      label: c.dim('(*) = user-added model'),
      value: '',
      disabled: true,
    } as never);
  }
  const model = await select('Select model:', modelOptions as never);

  const skipDangerous = await confirm(
    'Skip dangerous permissions?',
    config.defaults.skipDangerous,
  );
  const statusLine = await confirm('Include statusLine?', config.defaults.statusLine);

  const launchArgs: ParsedArgs = {
    ...args,
    provider: provider.id,
    model,
    skipDangerous,
    statusLine,
  };
  launchCommand(launchArgs, config);
}

async function interactiveConfigure(config: WhichCCConfig): Promise<void> {
  const all = resolveAllProviders(config);
  const options = all.map((p) => ({
    label: `${p.isCustom ? '[custom] ' : ''}${p.name} — ${p.defaultModel}${hasKey(p.id) ? ' [API ✓]' : ' [No Key]'}`,
    value: p.id,
  }));
  options.push({ label: '← Back', value: '__back__' });
  const pid = await select('Which provider?', options);
  if (pid === '__back__') return;

  const provider = resolveProvider(pid, config);
  if (!provider) return;

  const actions = [
    { label: 'Change default model', value: 'default' },
    { label: 'Add a model (manual)', value: 'add-model' },
  ];
  if (provider.userModels.length > 0 || provider.isCustom) {
    actions.push({ label: 'Remove a user-added model', value: 'remove-model' });
  }
  actions.push({ label: 'Update API key', value: 'update-key' });
  actions.push({ label: 'Remove API key', value: 'remove-key' });
  if (provider.isCustom) {
    actions.push({ label: 'Update base URL', value: 'update-url' });
    actions.push({ label: 'Delete this provider', value: 'delete' });
  }
  const action = await select('What to do?', actions);

  switch (action) {
    case 'default': {
      const m = await select(
        'Default model:',
        provider.models.map((mod) => ({ label: mod, value: mod })),
      );
      if (provider.isCustom) {
        updateCustomProvider(config, provider.id, { defaultModel: m });
      } else {
        const existing = config.providers[provider.id];
        if (existing) existing.defaultModel = m;
      }
      saveConfig(config);
      success(`Default model set: ${m}`);
      return;
    }
    case 'add-model': {
      const m = (await input('Model name:')).trim();
      if (!m) return;
      const asDefault = await confirm('Set as default?', false);
      if (provider.isCustom) {
        addModelToCustomProvider(config, provider.id, m, asDefault);
      } else {
        addUserModel(config, provider.id, m, asDefault);
        info('User-added model. Marked with (*). Run -u to sync with registry.');
      }
      saveConfig(config);
      success(`Model "${m}" added`);
      return;
    }
    case 'remove-model': {
      const removable = provider.isCustom ? provider.models : provider.userModels;
      if (removable.length === 0) {
        info('No removable models.');
        return;
      }
      const m = await select(
        'Remove model:',
        removable.map((mod) => ({ label: mod, value: mod })),
      );
      if (provider.isCustom) removeModelFromCustomProvider(config, provider.id, m);
      else removeUserModel(config, provider.id, m);
      saveConfig(config);
      success(`Model "${m}" removed`);
      return;
    }
    case 'update-key': {
      const k = (await input('Paste API key:', { masked: true })).trim();
      if (!k) return;
      setKey(provider.id, k);
      success('API key updated');
      return;
    }
    case 'remove-key': {
      const ok = await confirm('Remove stored API key?', false);
      if (!ok) return;
      const { removeKey } = await import('../../core/keys.js');
      removeKey(provider.id);
      success('API key removed');
      return;
    }
    case 'update-url': {
      const u = (await input('Base URL:')).trim();
      if (!u) return;
      updateCustomProvider(config, provider.id, { baseUrl: u });
      saveConfig(config);
      success('Base URL updated');
      return;
    }
    case 'delete': {
      const ok = await confirm(`Delete custom provider "${provider.name}"?`, false);
      if (!ok) return;
      removeCustomProvider(config, provider.id);
      saveConfig(config);
      success(`Custom provider "${provider.name}" deleted`);
      return;
    }
  }
}
