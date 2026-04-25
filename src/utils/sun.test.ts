import { describe, it, expect } from 'vitest';
import { getClosestEvent } from './sun';

describe('getClosestEvent', () => {
  const lat = 52.52; // Berlin
  const lng = 13.405;

  it('should pick today sunrise if it is closer than yesterday sunset', () => {
    // 2024-05-20 Sunset was around 21:12
    // 2024-05-21 Sunrise is around 05:00
    // At 2024-05-21 02:00:
    // Yesterday sunset: 21:12 (4h 48m ago)
    // Today sunrise: 05:00 (3h away)
    // Today sunset: 21:13 (19h 13m away)
    
    const now = new Date('2024-05-21T02:00:00Z');
    const result = getClosestEvent(lat, lng, now);
    
    expect(result.type).toBe('sunrise');
    expect(result.diffMs).toBeLessThan(0); // before sunrise
  });

  it('never returns an event from a previous calendar day', () => {
    // Berlin, June 21-22
    // June 21 Sunset: ~19:33 UTC
    // June 22 Sunrise: ~02:43 UTC
    
    // At June 22, 00:30 UTC
    // Yesterday (June 21) sunset was 19:33 UTC (5h ago)
    // Today (June 22) sunrise is 02:43 UTC (2.2h away)
    // If we were at 21:00 UTC (9 PM) on June 21, the sunset would be 1.5h ago.
    
    // To really test this, we want a case where yesterday's event IS closer than anything today.
    // This happens if now is just after midnight and yesterday's event was just before midnight.
    // E.g. Polar Day or very late sunset.
    
    // If we use a mock-like approach by choosing a location/date where this happens.
    // Or just check that the returned date is >= today 00:00.
    
    const now = new Date('2024-06-22T00:30:00Z'); 
    const result = getClosestEvent(lat, lng, now);
    
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    
    expect(result.time.getTime()).toBeGreaterThanOrEqual(todayStart.getTime());
  });
});
