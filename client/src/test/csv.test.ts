import { describe, expect, it } from 'vitest';
import { toCsv } from '../lib/csv';

describe('toCsv', () => {
  it('quotes cells and doubles quotes', () => {
    expect(toCsv([['Name', 'Note'], ['Ada "A" Lovelace', 'a,b']])).toBe('"Name","Note"\r\n"Ada ""A"" Lovelace","a,b"');
  });
  it('stops spreadsheet formulas from running', () => {
    expect(toCsv([['=HYPERLINK("x")', '+1+1', '@sum', '-cmd']])).toBe('"\'=HYPERLINK(""x"")","\'+1+1","\'@sum","\'-cmd"');
  });
  it('keeps real negative and plain numbers as they are', () => {
    expect(toCsv([[-5, 12, 0.5, null, undefined]])).toBe('"-5","12","0.5","",""');
  });
});
