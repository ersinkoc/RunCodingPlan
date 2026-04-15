import type { ParsedArgs, WhichCCConfig } from '../../types.js';
import { resolveProvider } from '../../core/providers.js';
import { addUserModel, removeUserModel, saveConfig } from '../../core/config.js';
import {
  addModelToCustomProvider,
  removeModelFromCustomProvider,
  updateCustomProvider,
} from '../../core/custom.js';
import { removeKey, setKey } from '../../core/keys.js';
import { success, error, info } from '../ui.js';

export function addModelCommand(args: ParsedArgs, config: WhichCCConfig): void {
  if (!args.provider || !args.addModel) {
    error('Usage: --provider <id> --add-model <model> [--set-default]');
    process.exit(1);
  }
  const provider = resolveProvider(args.provider, config);
  if (!provider) {
    error(`Unknown provider: ${args.provider}`);
    process.exit(1);
  }

  if (provider.isCustom) {
    addModelToCustomProvider(config, provider.id, args.addModel, args.setDefault);
    saveConfig(config);
    success(`Model "${args.addModel}" added to custom provider ${provider.name}`);
    if (args.setDefault) success(`Default model set: ${args.addModel}`);
    return;
  }

  addUserModel(config, provider.id, args.addModel, args.setDefault);
  saveConfig(config);
  success(`Model "${args.addModel}" added to ${provider.name}`);
  info('This is a user-added model. It will be marked with (*)');
  info('Run `npx whichclaude -u` to sync with official registry');
  if (args.setDefault) success(`Default model: ${args.addModel}`);
}

export function removeModelCommand(args: ParsedArgs, config: WhichCCConfig): void {
  if (!args.provider || !args.removeModel) {
    error('Usage: --provider <id> --remove-model <model>');
    process.exit(1);
  }
  const provider = resolveProvider(args.provider, config);
  if (!provider) {
    error(`Unknown provider: ${args.provider}`);
    process.exit(1);
  }

  if (provider.isCustom) {
    const { removed } = removeModelFromCustomProvider(config, provider.id, args.removeModel);
    if (!removed) {
      error(`Model "${args.removeModel}" not found or cannot be removed (custom providers need at least one model)`);
      process.exit(1);
    }
    saveConfig(config);
    success(`Model "${args.removeModel}" removed from ${provider.name}`);
    return;
  }

  const { removed } = removeUserModel(config, provider.id, args.removeModel);
  if (!removed) {
    error(
      `Model "${args.removeModel}" is not user-added. Registry models cannot be removed.`,
    );
    process.exit(1);
  }
  saveConfig(config);
  success(`User-added model "${args.removeModel}" removed from ${provider.name}`);
}

export function setApiKeyCommand(args: ParsedArgs, config: WhichCCConfig): void {
  if (!args.provider || !args.apikey) {
    error('Usage: --provider <id> --apikey <key>');
    process.exit(1);
  }
  const provider = resolveProvider(args.provider, config);
  if (!provider) {
    error(`Unknown provider: ${args.provider}`);
    process.exit(1);
  }
  setKey(provider.id, args.apikey);
  success(`API key saved for ${provider.name} (encrypted)`);
}

export function removeApiKeyCommand(args: ParsedArgs, config: WhichCCConfig): void {
  if (!args.provider) {
    error('Usage: --provider <id> --remove-key');
    process.exit(1);
  }
  const provider = resolveProvider(args.provider, config);
  if (!provider) {
    error(`Unknown provider: ${args.provider}`);
    process.exit(1);
  }
  const removed = removeKey(provider.id);
  if (removed) {
    success(`API key removed for ${provider.name}`);
  } else {
    info(`No API key set for ${provider.name}`);
  }
}

export function setDefaultModelCommand(args: ParsedArgs, config: WhichCCConfig): void {
  if (!args.provider || !args.model) {
    error('Usage: --provider <id> --model <model> --set-default');
    process.exit(1);
  }
  const provider = resolveProvider(args.provider, config);
  if (!provider) {
    error(`Unknown provider: ${args.provider}`);
    process.exit(1);
  }
  if (!provider.models.includes(args.model)) {
    error(`Model "${args.model}" not available for ${provider.name}`);
    process.exit(1);
  }
  if (provider.isCustom) {
    updateCustomProvider(config, provider.id, { defaultModel: args.model });
  } else {
    const existing = config.providers[provider.id];
    if (existing) existing.defaultModel = args.model;
    else config.providers[provider.id] = { defaultModel: args.model, userModels: [] };
  }
  saveConfig(config);
  success(`Default model for ${provider.name} set to ${args.model}`);
}
