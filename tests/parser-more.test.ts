import { describe, it, expect } from 'vitest';
import { parseArgs, ParseError } from '../src/cli/parser.js';

describe('parser edge cases', () => {
  it('throws ParseError on unknown argument', () => {
    expect(() => parseArgs(['bogus'])).toThrow(ParseError);
  });

  it('throws ParseError on unknown flag', () => {
    expect(() => parseArgs(['--nope'])).toThrow(ParseError);
  });

  it('throws when string flag is at the end', () => {
    expect(() => parseArgs(['--provider'])).toThrow(/requires a value/);
  });

  it('throws when value of string flag starts with dash', () => {
    expect(() => parseArgs(['--provider', '--list'])).toThrow(/requires a value/);
  });

  it('sets all bool flags via aliases', () => {
    const r = parseArgs(['-u', '-l', '-v', '-h', '-sd', '-sl']);
    expect(r.update).toBe(true);
    expect(r.list).toBe(true);
    expect(r.version).toBe(true);
    expect(r.help).toBe(true);
    expect(r.skipDangerous).toBe(true);
    expect(r.statusLine).toBe(true);
  });

  it('sets all long bool flags', () => {
    const r = parseArgs([
      '--status',
      '--list-custom',
      '--remove-key',
      '--add-custom',
      '--set-default',
      '--clean',
      '--no-launch',
      '--dry-run',
    ]);
    expect(r.status).toBe(true);
    expect(r.listCustom).toBe(true);
    expect(r.removeKey).toBe(true);
    expect(r.addCustom).toBe(true);
    expect(r.setDefault).toBe(true);
    expect(r.clean).toBe(true);
    expect(r.noLaunch).toBe(true);
    expect(r.dryRun).toBe(true);
  });

  it('sets all string flags', () => {
    const r = parseArgs([
      '--provider', 'zai',
      '--model', 'm',
      '--apikey', 'k',
      '--remove-custom', 'x',
      '--add-model', 'am',
      '--remove-model', 'rm',
      '--name', 'N',
      '--url', 'https://u',
    ]);
    expect(r.provider).toBe('zai');
    expect(r.model).toBe('m');
    expect(r.apikey).toBe('k');
    expect(r.removeCustom).toBe('x');
    expect(r.addModel).toBe('am');
    expect(r.removeModel).toBe('rm');
    expect(r.name).toBe('N');
    expect(r.url).toBe('https://u');
  });

  it('short -a/-m/-p aliases resolve', () => {
    const r = parseArgs(['-p', 'zai', '-m', 'glm-5', '-a', 'sk-x']);
    expect(r.provider).toBe('zai');
    expect(r.model).toBe('glm-5');
    expect(r.apikey).toBe('sk-x');
  });
});
