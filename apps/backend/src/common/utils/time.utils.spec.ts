import { getTimestampMs } from './time.utils';

describe('getTimestampMs', () => {
  it('should convert Unix timestamp in seconds to milliseconds', () => {
    const seconds = 1785636832;
    expect(getTimestampMs(seconds)).toBe(1785636832000);
  });

  it('should preserve Unix timestamp in milliseconds', () => {
    const ms = 1785636832000;
    expect(getTimestampMs(ms)).toBe(1785636832000);
  });

  it('should parse ISO date string', () => {
    const isoString = '2026-08-03T07:45:00.000Z';
    const expected = new Date(isoString).getTime();
    expect(getTimestampMs(isoString)).toBe(expected);
  });

  it('should handle Date object', () => {
    const d = new Date();
    expect(getTimestampMs(d)).toBe(d.getTime());
  });

  it('should return null for null or undefined', () => {
    expect(getTimestampMs(null)).toBeNull();
    expect(getTimestampMs(undefined)).toBeNull();
  });

  it('should return null for invalid date strings or negative/NaN numbers', () => {
    expect(getTimestampMs('invalid-date')).toBeNull();
    expect(getTimestampMs(NaN)).toBeNull();
    expect(getTimestampMs(-100)).toBeNull();
  });
});
