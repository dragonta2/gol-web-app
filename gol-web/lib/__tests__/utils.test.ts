import { describe, it, expect } from 'vitest';
import {
  applyAiTextLineBreaks,
  cn,
  insertBlankLineEveryTwoLines,
  normalizeCoachingGreetingParagraphGap,
} from '../utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    const result = cn('class1', 'class2');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
  });

  it('handles conditional classes', () => {
    const result = cn('base', false && 'hidden', 'visible');
    expect(result).toContain('base');
    expect(result).toContain('visible');
    expect(result).not.toContain('hidden');
  });

  it('handles undefined and null', () => {
    const result = cn('base', undefined, null, 'visible');
    expect(result).toContain('base');
    expect(result).toContain('visible');
  });
});

describe('normalizeCoachingGreetingParagraphGap', () => {
  it('always uses exactly one blank line after よ。', () => {
    expect(normalizeCoachingGreetingParagraphGap('太郎よ。\n本文です。')).toBe(
      '太郎よ。\n\n本文です。'
    );
    expect(normalizeCoachingGreetingParagraphGap('太郎よ。\n\n\n本文です。')).toBe(
      '太郎よ。\n\n本文です。'
    );
  });

  it('normalizes CRLF and strips extra leading newlines before body', () => {
    expect(normalizeCoachingGreetingParagraphGap('太郎よ。\r\n\r\n\r\n本文')).toBe(
      '太郎よ。\n\n本文'
    );
  });

  it('strips leading newlines before greeting so regex still applies', () => {
    expect(normalizeCoachingGreetingParagraphGap('\n\n太郎よ。\n\n\n本文')).toBe(
      '太郎よ。\n\n本文'
    );
  });

  it('accepts fullwidth period after よ', () => {
    expect(normalizeCoachingGreetingParagraphGap('太郎よ．本文')).toBe('太郎よ．\n\n本文');
  });

  it('strips Markdown hard-break (two spaces + newline) after よ。', () => {
    expect(normalizeCoachingGreetingParagraphGap('太郎よ。  \nまず、次。')).toBe('太郎よ。\n\nまず、次。');
  });

  it('coaching pipeline without insertBlankLineEveryTwoLines: applyAiTextLineBreaks + collapse + normalize', () => {
    const raw = '太郎よ。\n\n続きの文章。';
    let s = applyAiTextLineBreaks(raw);
    s = s.replace(/\n{3,}/g, '\n\n');
    s = normalizeCoachingGreetingParagraphGap(s);
    expect(s).toBe('太郎よ。\n\n続きの文章。');
  });
});

describe('applyAiTextLineBreaks', () => {
  it('normalizes bare CR so newline collapse works (tension API sometimes returns \\r)', () => {
    const out = applyAiTextLineBreaks('太郎よ。\r\r\r\r次の文。');
    expect(out).not.toContain('\r');
    expect(out).toBe('太郎よ。\n\n次の文。');
  });
});

describe('insertBlankLineEveryTwoLines', () => {
  it('inserts a blank line between every group of 2 lines', () => {
    expect(insertBlankLineEveryTwoLines('a\nb\nc\nd')).toBe('a\nb\n\nc\nd');
  });
});
