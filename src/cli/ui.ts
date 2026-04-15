import { ANSI, BOX } from '../constants.js';

export function color(text: string, code: string): string {
  return `${code}${text}${ANSI.reset}`;
}

export const c = {
  bold: (t: string) => color(t, ANSI.bold),
  dim: (t: string) => color(t, ANSI.dim),
  red: (t: string) => color(t, ANSI.red),
  green: (t: string) => color(t, ANSI.green),
  yellow: (t: string) => color(t, ANSI.yellow),
  blue: (t: string) => color(t, ANSI.blue),
  magenta: (t: string) => color(t, ANSI.magenta),
  cyan: (t: string) => color(t, ANSI.cyan),
  gray: (t: string) => color(t, ANSI.gray),
  underline: (t: string) => color(t, ANSI.underline),
};

const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

export function visibleLength(s: string): number {
  // strip ANSI, count chars — best-effort (most emoji render as 2 cells)
  const stripped = s.replace(ANSI_REGEX, '');
  let length = 0;
  for (const ch of stripped) {
    /* c8 ignore next -- codePointAt(0) returns defined for any iterated char */
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x1f000 || code === 0x2705 || code === 0x26a0 || code === 0x1f511) {
      length += 2;
    } else {
      length += 1;
    }
  }
  return length;
}

export function banner(version: string): string {
  const art = [
    '  ╦═╗╦ ╦╔╗╔╔═╗╔═╗╔╦╗╦╔╗╔╔═╗╔═╗╦  ╔═╗╔╗╔',
    '  ╠╦╝║ ║║║║║  ║ ║ ║║║║║║║ ╦╠═╝║  ╠═╣║║║',
    '  ╩╚═╚═╝╝╚╝╚═╝╚═╝═╩╝╩╝╚╝╚═╝╩  ╩═╝╩ ╩╝╚╝',
  ];
  const lines: string[] = [];
  for (const line of art) lines.push(c.magenta(line));
  lines[lines.length - 1] += '  ' + c.gray(`v${version}`);
  lines.push('');
  lines.push(c.dim('  Run Claude Code with any plan.'));
  lines.push('');
  return lines.join('\n');
}

export function footerPlug(): string {
  return [
    '',
    c.dim('  ── Also by @ersinkoc ───────────────────────────────────────────────'),
    c.dim('  • ') + c.cyan('project-architect') + c.dim(' — docs-first planning → single-shot agent prompt'),
    c.dim('    https://github.com/ersinkoc/project-architect'),
    c.dim('  • ') + c.cyan('security-check   ') + c.dim(' — your AI becomes a security team, zero tools'),
    c.dim('    npx skills add ersinkoc/security-check'),
    '',
  ].join('\n');
}

export function box(title: string, rows: string[], width = 48): string {
  const lines: string[] = [];
  const header = ` ${title} `;
  const headerPad = Math.max(0, width - 2 - header.length);
  lines.push(
    BOX.topLeft +
      BOX.horizontal +
      header +
      BOX.horizontal.repeat(headerPad) +
      BOX.topRight,
  );
  for (const row of rows) {
    const pad = Math.max(0, width - 2 - visibleLength(row));
    lines.push(BOX.vertical + ' ' + row + ' '.repeat(pad) + ' ' + BOX.vertical);
  }
  lines.push(BOX.bottomLeft + BOX.horizontal.repeat(width - 2) + BOX.bottomRight);
  return lines.map((l) => '  ' + l).join('\n');
}

export function sectionBox(
  sections: { title: string; rows: string[] }[],
  width = 48,
): string {
  if (sections.length === 0) return '';
  const lines: string[] = [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    /* c8 ignore next -- defensive guard; for-loop bounds prevent undefined */
    if (!section) continue;
    const header = ` ${section.title} `;
    const headerPad = Math.max(0, width - 2 - header.length);
    if (i === 0) {
      lines.push(
        BOX.topLeft +
          BOX.horizontal +
          header +
          BOX.horizontal.repeat(headerPad) +
          BOX.topRight,
      );
    } else {
      lines.push(
        BOX.teeRight +
          BOX.horizontal +
          header +
          BOX.horizontal.repeat(headerPad) +
          BOX.teeLeft,
      );
    }
    for (const row of section.rows) {
      const pad = Math.max(0, width - 2 - visibleLength(row));
      lines.push(BOX.vertical + ' ' + row + ' '.repeat(pad) + ' ' + BOX.vertical);
    }
  }
  lines.push(BOX.bottomLeft + BOX.horizontal.repeat(width - 2) + BOX.bottomRight);
  return lines.map((l) => '  ' + l).join('\n');
}

export function success(msg: string): void {
  console.log(`  ${c.green('✓')} ${msg}`);
}
export function warn(msg: string): void {
  console.log(`  ${c.yellow('⚠')} ${msg}`);
}
export function error(msg: string): void {
  console.error(`  ${c.red('✗')} ${msg}`);
}
export function info(msg: string): void {
  console.log(`  ${c.blue('ℹ')} ${msg}`);
}

export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '•'.repeat(key.length);
  return key.slice(0, 4) + '•'.repeat(Math.max(4, key.length - 8)) + key.slice(-4);
}

export function showCursor(): void {
  process.stdout.write(ANSI.cursorShow);
}

export function hideCursor(): void {
  process.stdout.write(ANSI.cursorHide);
}

export function restoreTerminal(): void {
  try {
    showCursor();
    process.stdout.write(ANSI.reset);
  } catch {
    // ignore
  }
}
