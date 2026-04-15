import { parseArgs, ParseError } from './cli/parser.js';
import { loadConfig } from './core/config.js';
import { launchCommand } from './cli/commands/launch.js';
import { listCommand } from './cli/commands/list.js';
import { statusCommand } from './cli/commands/status.js';
import { updateCommand } from './cli/commands/update.js';
import { cleanCommand } from './cli/commands/clean.js';
import { addCustomCommand, removeCustomCommand } from './cli/commands/custom.js';
import {
  addModelCommand,
  removeModelCommand,
  setApiKeyCommand,
  removeApiKeyCommand,
  setDefaultModelCommand,
} from './cli/commands/configure.js';
import { printHelp } from './cli/commands/help.js';
import { showTemplateCommand, resetTemplateCommand } from './cli/commands/template.js';
import { runInteractive } from './cli/commands/interactive-flow.js';
import { VERSION } from './constants.js';
import { error, restoreTerminal } from './cli/ui.js';

async function main(): Promise<void> {
  process.on('SIGINT', () => {
    restoreTerminal();
    console.log('\n  Cancelled.');
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    restoreTerminal();
    process.exit(143);
  });
  /* c8 ignore next 3 -- process 'exit' fires after test completion; not reliably coverable */
  process.on('exit', () => {
    restoreTerminal();
  });

  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    if (e instanceof ParseError) {
      error(e.message);
      console.log('\n  Run `npx whichcc --help` for usage.');
      process.exit(1);
    }
    throw e;
  }

  if (args.help) {
    printHelp();
    return;
  }
  if (args.version) {
    console.log(VERSION);
    return;
  }

  const config = loadConfig();

  if (args.update) {
    await updateCommand(config);
    return;
  }
  if (args.list) {
    listCommand(config, false);
    return;
  }
  if (args.listCustom) {
    listCommand(config, true);
    return;
  }
  if (args.status) {
    statusCommand(config);
    return;
  }
  if (args.clean) {
    await cleanCommand(false);
    return;
  }
  if (args.showTemplate) {
    showTemplateCommand();
    return;
  }
  if (args.resetTemplate) {
    resetTemplateCommand();
    return;
  }
  if (args.addCustom) {
    await addCustomCommand(args, config);
    return;
  }
  if (args.removeCustom) {
    removeCustomCommand(args.removeCustom, config);
    return;
  }
  if (args.provider && args.addModel) {
    addModelCommand(args, config);
    return;
  }
  if (args.provider && args.removeModel) {
    removeModelCommand(args, config);
    return;
  }
  if (args.provider && args.removeKey) {
    removeApiKeyCommand(args, config);
    return;
  }
  if (args.provider && args.model && args.setDefault && !args.apikey) {
    setDefaultModelCommand(args, config);
    return;
  }
  if (args.provider && args.apikey && !args.model) {
    setApiKeyCommand(args, config);
    return;
  }
  if (args.provider) {
    launchCommand(args, config);
    return;
  }

  await runInteractive(args, config);
}

main().catch((e: unknown) => {
  restoreTerminal();
  if (e instanceof Error) {
    error(e.message);
  } else {
    error(String(e));
  }
  process.exit(1);
});
