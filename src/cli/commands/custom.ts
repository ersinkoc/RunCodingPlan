import type { ParsedArgs, WhichCCConfig, CustomProvider } from '../../types.js';
import {
  addCustomProvider,
  generateProviderId,
  removeCustomProvider,
  validateCustomProviderInput,
} from '../../core/custom.js';
import { saveConfig } from '../../core/config.js';
import { setKey } from '../../core/keys.js';
import { success, error, info } from '../ui.js';
import { input, select, confirm } from '../interactive.js';
import { launchCommand } from './launch.js';

export async function addCustomCommand(
  args: ParsedArgs,
  config: WhichCCConfig,
): Promise<void> {
  // Flag-based (non-interactive) path
  if (args.name && args.url && args.apikey && args.model) {
    const id = generateProviderId(args.name);
    const validation = validateCustomProviderInput({
      name: args.name,
      baseUrl: args.url,
      models: [args.model],
      defaultModel: args.model,
    });
    if (!validation.ok) {
      error(validation.error);
      process.exit(1);
    }
    const provider: CustomProvider = {
      name: args.name,
      baseUrl: args.url,
      models: [args.model],
      defaultModel: args.model,
      addedAt: new Date().toISOString(),
    };
    addCustomProvider(config, id, provider);
    setKey(id, args.apikey);
    saveConfig(config);
    success(`Custom provider "${args.name}" saved (id: ${id})`);
    success(`API key encrypted`);
    return;
  }

  // Interactive path
  const name = (await input('Provider name:')).trim();
  if (!name) {
    error('Provider name cannot be empty');
    process.exit(1);
  }
  const id = generateProviderId(name);
  const url = (await input('Base URL (Anthropic-compatible):')).trim();
  const apikey = (await input('Paste your API key:', { masked: true })).trim();
  if (!apikey) {
    error('API key required');
    process.exit(1);
  }

  const models: string[] = [];
  do {
    const m = (await input(`Model name${models.length > 0 ? ' (or empty to finish)' : ''}:`))
      .trim();
    if (!m && models.length > 0) break;
    if (!m) {
      error('At least one model required');
      continue;
    }
    if (!models.includes(m)) models.push(m);
    const more = await confirm('Add another model?', false);
    if (!more) break;
  } while (true);

  /* c8 ignore next -- loop guarantees at least one model */
  let defaultModel = models[0] ?? '';
  if (models.length > 1) {
    defaultModel = await select(
      'Default model:',
      models.map((m) => ({ label: m, value: m })),
    );
  }

  const validation = validateCustomProviderInput({
    name,
    baseUrl: url,
    models,
    defaultModel,
  });
  if (!validation.ok) {
    error(validation.error);
    process.exit(1);
  }

  const provider: CustomProvider = {
    name,
    baseUrl: url,
    models,
    defaultModel,
    addedAt: new Date().toISOString(),
  };

  addCustomProvider(config, id, provider);
  setKey(id, apikey);
  saveConfig(config);

  success(`Custom provider "${name}" saved (id: ${id})`);
  success(`API key encrypted`);
  success(`${models.length} model(s) registered, default: ${defaultModel}`);

  const launchNow = await confirm('Launch now?', true);
  if (launchNow) {
    const launchArgs: ParsedArgs = {
      ...args,
      provider: id,
      model: defaultModel,
    };
    launchCommand(launchArgs, config);
  }
}

export function removeCustomCommand(id: string, config: WhichCCConfig): void {
  const { removed } = removeCustomProvider(config, id);
  if (!removed) {
    error(`Custom provider not found: ${id}`);
    process.exit(1);
  }
  saveConfig(config);
  success(`Custom provider "${id}" removed (including API key).`);
  info('Session files for this provider are not auto-deleted; run --clean to remove old ones.');
}
