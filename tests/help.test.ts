import { describe, it, expect } from 'vitest';
import { printHelp } from '../src/cli/commands/help.js';
import { captureIO } from './helpers/captureIO.js';

describe('printHelp', () => {
  it('prints usage information to stdout', () => {
    const cap = captureIO();
    try {
      printHelp();
    } finally {
      cap.restore();
    }
    const combined = cap.out.join('\n');
    expect(combined).toContain('whichclaude');
    expect(combined).toContain('USAGE');
    expect(combined).toContain('PROVIDERS');
    expect(combined).toContain('EXAMPLES');
  });
});
