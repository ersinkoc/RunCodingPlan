import type { ParsedArgs, WhichCCConfig } from '../../types.js';
import { resolveProvider } from '../../core/providers.js';
import { getKey, hasKey, setKey } from '../../core/keys.js';
import { buildSessionSettings, writeSessionFile, cleanOldSessions } from '../../core/session.js';
import { launchClaudeCode } from '../../core/launcher.js';
import { saveConfig, setLastUsed } from '../../core/config.js';
import { c, success, error, info } from '../ui.js';

export function launchCommand(args: ParsedArgs, config: WhichCCConfig): void {
  if (!args.provider) {
    error('Provider is required. Use -p <provider>');
    process.exit(1);
  }
  const provider = resolveProvider(args.provider, config);
  if (!provider) {
    error(`Unknown provider: ${args.provider}`);
    process.exit(1);
  }

  if (args.apikey) {
    setKey(provider.id, args.apikey);
    success(`API key saved for ${provider.name} (encrypted)`);
  }

  if (!hasKey(provider.id)) {
    error(`No API key set for ${provider.name}.`);
    if (provider.affiliateUrl) {
      info(`Discount signup (affiliate): ${c.underline(provider.affiliateUrl)}`);
    } else if (provider.signupUrl) {
      info(`Get a key: ${c.underline(provider.signupUrl)}`);
    }
    info(`Set it: npx whichclaude -p ${provider.id} -a <your-key>`);
    process.exit(1);
  }

  const model = args.model ?? provider.defaultModel;
  if (!provider.models.includes(model)) {
    error(`Model "${model}" not available for ${provider.name}.`);
    info(`Available: ${provider.models.join(', ')}`);
    process.exit(1);
  }

  const apiKey = getKey(provider.id);
  if (!apiKey) {
    error('Failed to decrypt API key. Re-set it with -a flag.');
    process.exit(1);
  }

  const useStatusLine = args.statusLine ?? config.defaults.statusLine;
  const skipDangerous = args.skipDangerous ?? config.defaults.skipDangerous;

  const settings = buildSessionSettings(provider.baseUrl, apiKey, model, {
    statusLine: useStatusLine,
    statusLineCommand: config.defaults.statusLineCommand,
  });

  if (args.dryRun) {
    console.log(JSON.stringify(settings, null, 2));
    return;
  }

  cleanOldSessions();
  const sessionPath = writeSessionFile(provider.id, settings);
  success(`Session created: ${sessionPath}`);
  setLastUsed(config, provider.id, model);
  saveConfig(config);

  if (args.noLaunch) {
    info('Skipping launch (--no-launch).');
    info(`Run manually: claude --settings "${sessionPath}"`);
    return;
  }

  console.log('');
  info(
    `Launching Claude Code with ${c.cyan(provider.name)} / ${c.cyan(model)} ...`,
  );
  launchClaudeCode({ sessionPath, skipDangerous });
}
