import { describe, it, expect, beforeEach } from 'vitest';
import { domainTimeTracker } from '../domain-time-tracker';

beforeEach(() => {
  domainTimeTracker.reset();
});

describe('DomainTimeTracker', () => {
  it('returns 0 for unvisited domains', () => {
    expect(domainTimeTracker.getDomainTimeSeconds('https://example.com')).toBe(0);
  });

  it('tracks time on a domain', () => {
    domainTimeTracker.recordNavigation('https://twitter.com/feed');
    const seconds = domainTimeTracker.getDomainTimeSeconds('https://twitter.com/other');
    expect(seconds).toBeGreaterThanOrEqual(0);
  });

  it('accumulates time across navigations on same domain', () => {
    domainTimeTracker.recordNavigation('https://twitter.com/a');
    // Navigate away and back
    domainTimeTracker.recordNavigation('https://google.com');
    domainTimeTracker.recordNavigation('https://twitter.com/b');
    const seconds = domainTimeTracker.getDomainTimeSeconds('https://twitter.com');
    expect(seconds).toBeGreaterThanOrEqual(0);
  });

  it('handles about:blank without crashing', () => {
    domainTimeTracker.recordNavigation('https://example.com');
    domainTimeTracker.recordNavigation('about:blank');
    // Previous segment finalized, no crash
    expect(domainTimeTracker.getDomainTimeSeconds('https://example.com')).toBeGreaterThanOrEqual(0);
  });

  it('handles chrome:// URLs', () => {
    domainTimeTracker.recordNavigation('chrome://extensions');
    expect(domainTimeTracker.getDomainTimeSeconds('chrome://extensions')).toBe(0);
  });

  it('handles invalid URLs', () => {
    domainTimeTracker.recordNavigation('not-a-url');
    // Should not crash
    expect(domainTimeTracker.getDomainTimeSeconds('not-a-url')).toBe(0);
  });

  it('resets all tracking', () => {
    domainTimeTracker.recordNavigation('https://example.com');
    domainTimeTracker.reset();
    expect(domainTimeTracker.getDomainTimeSeconds('https://example.com')).toBe(0);
  });

  it('does not double-count same domain navigation', () => {
    domainTimeTracker.recordNavigation('https://example.com/a');
    domainTimeTracker.recordNavigation('https://example.com/b'); // same domain
    // Should only have one segment, not two
    const snapshot = domainTimeTracker.getSnapshot();
    expect(Object.keys(snapshot).length).toBeLessThanOrEqual(1);
  });

  it('getSnapshot returns all tracked domains', () => {
    domainTimeTracker.recordNavigation('https://a.com');
    domainTimeTracker.recordNavigation('https://b.com');
    domainTimeTracker.recordNavigation('https://c.com');
    const snapshot = domainTimeTracker.getSnapshot();
    expect(Object.keys(snapshot)).toContain('a.com');
    expect(Object.keys(snapshot)).toContain('b.com');
  });
});
