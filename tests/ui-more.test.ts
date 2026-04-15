import { describe, it, expect, vi } from 'vitest';
import {
  banner,
  box,
  sectionBox,
  success,
  warn,
  error,
  info,
  visibleLength,
  hideCursor,
  showCursor,
  restoreTerminal,
} from '../src/cli/ui.js';
import { captureIO } from './helpers/captureIO.js';

describe('ui banner/box/sectionBox', () => {
  it('banner includes version and art', () => {
    const s = banner('9.9.9');
    expect(s).toContain('v9.9.9');
    expect(s.split('\n').length).toBeGreaterThan(3);
  });

  it('box renders rows with a border', () => {
    const s = box('Title', ['row 1', 'row two']);
    expect(s).toContain('Title');
    expect(s).toContain('row 1');
    expect(s).toContain('row two');
    expect(s).toContain('┌');
    expect(s).toContain('└');
  });

  it('sectionBox returns empty string when no sections', () => {
    expect(sectionBox([])).toBe('');
  });

  it('sectionBox supports multiple sections', () => {
    const s = sectionBox(
      [
        { title: 'A', rows: ['a-row'] },
        { title: 'B', rows: ['b-row'] },
      ],
      40,
    );
    expect(s).toContain('A');
    expect(s).toContain('a-row');
    expect(s).toContain('B');
    expect(s).toContain('b-row');
    expect(s).toContain('├');
  });

  it('sectionBox skips holes in the array (defensive)', () => {
    const sections = [{ title: 'A', rows: ['x'] }];
    const s = sectionBox(sections, 30);
    expect(s).toContain('A');
  });

  it('visibleLength ignores ANSI and counts wide chars as 2', () => {
    expect(visibleLength('\x1b[31mabc\x1b[0m')).toBe(3);
    expect(visibleLength('✅')).toBe(2);
    expect(visibleLength('⚠')).toBe(2);
    expect(visibleLength('🔑')).toBe(2);
  });
});

describe('ui messages', () => {
  it('success/warn/info write to stdout; error writes to stderr', () => {
    const cap = captureIO();
    try {
      success('ok');
      warn('watch');
      info('note');
      error('bad');
    } finally {
      cap.restore();
    }
    expect(cap.out.some((l) => l.includes('ok'))).toBe(true);
    expect(cap.out.some((l) => l.includes('watch'))).toBe(true);
    expect(cap.out.some((l) => l.includes('note'))).toBe(true);
    expect(cap.err.some((l) => l.includes('bad'))).toBe(true);
  });
});

describe('cursor helpers', () => {
  it('hideCursor / showCursor / restoreTerminal write escape codes', () => {
    const writes: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writes.push(String(chunk));
      return true;
    });
    try {
      hideCursor();
      showCursor();
      restoreTerminal();
    } finally {
      spy.mockRestore();
    }
    expect(writes.join('')).toContain('\x1b[?25l');
    expect(writes.join('')).toContain('\x1b[?25h');
  });

  it('restoreTerminal swallows errors', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => {
      throw new Error('broken');
    });
    try {
      expect(() => restoreTerminal()).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });
});
