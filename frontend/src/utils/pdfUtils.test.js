import { describe, it, expect } from 'vitest';
import { formatBytes, parsePageRange, indicesToRangeString, reorderArrayItem } from './pdfUtils';

describe('pdfUtils', () => {
  it('formats byte sizes cleanly across units', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(null)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536, 1)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('parses page ranges with clamping, reversed bounds, and deduplication', () => {
    expect(parsePageRange('1-3, 5, 8', 10)).toEqual([0, 1, 2, 4, 7]);
    expect(parsePageRange('5-2, 2, 12, 0, abc', 6)).toEqual([1, 2, 3, 4]);
    expect(parsePageRange('', 5)).toEqual([]);
  });

  it('converts 0-based page indices back into human-readable ranges', () => {
    expect(indicesToRangeString([])).toBe('');
    expect(indicesToRangeString([0])).toBe('1');
    expect(indicesToRangeString([2, 0, 1, 4, 5, 5, 8])).toBe('1-3, 5-6, 9');
  });

  it('reorders items without mutating original array', () => {
    const src = ['a', 'b', 'c'];
    expect(reorderArrayItem(src, 0, 1)).toEqual(['b', 'a', 'c']);
    expect(reorderArrayItem(src, 0, -1)).toBe(src);
    expect(reorderArrayItem(src, 2, 1)).toBe(src);
    expect(src).toEqual(['a', 'b', 'c']);
  });
});
