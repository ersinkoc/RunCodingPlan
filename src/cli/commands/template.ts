import {
  getDefaultTemplate,
  hasCustomTemplate,
  readRawTemplate,
  writeTemplate,
} from '../../core/template.js';
import { TEMPLATE_PATH } from '../../constants.js';
import { c, success, info } from '../ui.js';

export function showTemplateCommand(): void {
  console.log('');
  console.log('  ' + c.bold('Session template'));
  console.log('  ' + c.dim('Path: ') + TEMPLATE_PATH);
  console.log(
    '  ' +
      c.dim('Source: ') +
      (hasCustomTemplate() ? c.green('user-customized') : c.dim('default (built-in)')),
  );
  console.log('');
  console.log('  ' + c.dim('Placeholders:'));
  console.log('    ' + c.cyan('[[PROVIDER_URL]]') + '      → provider base URL');
  console.log('    ' + c.cyan('[[APIKEY]]') + '            → decrypted API key');
  console.log('    ' + c.cyan('[[MODEL]]') + '             → selected model id');
  console.log('    ' + c.cyan('[[STATUSLINE_COMMAND]]') + ' → status line command');
  console.log('');
  const raw = readRawTemplate() ?? JSON.stringify(getDefaultTemplate(), null, 2);
  console.log(raw);
  console.log('');
  info(`Edit: open the file at ${TEMPLATE_PATH}`);
  info('Reset: npx whichclaude --reset-template');
}

export function resetTemplateCommand(): void {
  const path = writeTemplate(getDefaultTemplate());
  success(`Template reset to default: ${path}`);
}
