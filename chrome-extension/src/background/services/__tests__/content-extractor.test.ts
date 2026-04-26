import { describe, it, expect, beforeEach } from 'vitest';
import { contentExtractor } from '../content-extractor';

beforeEach(() => {
  contentExtractor.reset();
});

describe('ContentExtractor', () => {
  describe('price extraction', () => {
    it('extracts USD prices', () => {
      const result = contentExtractor.extract('Item costs $199.99 and $50');
      expect(result.prices).toContain(199.99);
      expect(result.prices).toContain(50);
      expect(result.max_price).toBe(199.99);
      expect(result.min_price).toBe(50);
    });

    it('extracts multi-currency prices', () => {
      const result = contentExtractor.extract('€100 and £250 and ¥5000');
      expect(result.prices.length).toBeGreaterThanOrEqual(2);
      expect(result.max_price).toBeGreaterThanOrEqual(250);
    });

    it('extracts USD-prefixed prices', () => {
      const result = contentExtractor.extract('Total: USD 1,234.56');
      expect(result.prices).toContain(1234.56);
    });

    it('caps at 100 prices', () => {
      const text = Array.from({ length: 200 }, (_, i) => `$${i + 1}`).join(' ');
      const result = contentExtractor.extract(text);
      expect(result.prices.length).toBeLessThanOrEqual(100);
    });

    it('returns empty for no prices', () => {
      const result = contentExtractor.extract('no prices here');
      expect(result.prices).toEqual([]);
      expect(result.max_price).toBe(0);
    });
  });

  describe('email extraction', () => {
    it('extracts emails', () => {
      const result = contentExtractor.extract('Contact user@example.com or admin@test.org');
      expect(result.emails).toContain('user@example.com');
      expect(result.emails).toContain('admin@test.org');
    });

    it('deduplicates emails', () => {
      const result = contentExtractor.extract('user@test.com and USER@TEST.COM');
      expect(result.emails.length).toBe(1);
    });
  });

  describe('phone extraction', () => {
    it('extracts international phone numbers', () => {
      const result = contentExtractor.extract('Call us at +1 (415) 555-2671 for support');
      expect(result.phone_numbers).toContain('+1 (415) 555-2671');
    });

    it('does not treat short numeric sequences as phone numbers', () => {
      const result = contentExtractor.extract('Order 1234567 ships on 2024-01-05 to ZIP 94107');
      expect(result.phone_numbers).toEqual([]);
      expect(result.sensitive_terms).not.toContain('phone');
    });
  });

  describe('salary detection', () => {
    it('detects salary with keyword', () => {
      const result = contentExtractor.extract('Salary: $150,000 per year');
      expect(result.has_salary_figures).toBe(true);
      expect(result.salary_figures.length).toBeGreaterThan(0);
    });

    it('detects compensation amounts', () => {
      const result = contentExtractor.extract('Total compensation $200K annual');
      expect(result.has_salary_figures).toBe(true);
    });

    it('does not false-positive on regular prices', () => {
      const result = contentExtractor.extract('This item costs $29.99');
      expect(result.has_salary_figures).toBe(false);
    });
  });

  describe('equity detection', () => {
    it('detects equity percentages', () => {
      const result = contentExtractor.extract('You will receive 2.5% equity vesting over 4 years');
      expect(result.has_equity_info).toBe(true);
      expect(result.equity_percentages).toContain(2.5);
    });

    it('detects stock options', () => {
      const result = contentExtractor.extract('10% stock options');
      expect(result.has_equity_info).toBe(true);
    });
  });

  describe('government ID detection', () => {
    it('detects US SSN pattern', () => {
      const result = contentExtractor.extract('SSN: 123-45-6789');
      expect(result.has_gov_ids).toBe(true);
    });
  });

  describe('credit card detection', () => {
    it('detects credit card patterns', () => {
      const result = contentExtractor.extract('Card: 4111 1111 1111 1111');
      expect(result.has_credit_cards).toBe(true);
    });
  });

  describe('API key detection', () => {
    it('detects API key patterns', () => {
      const result = contentExtractor.extract('Use api_key_abcdefghijklmnopqrstuvwxyz123');
      expect(result.has_api_keys).toBe(true);
    });
  });

  describe('sensitive PII flag', () => {
    it('flags when any sensitive data found', () => {
      const result = contentExtractor.extract('Email: user@test.com');
      expect(result.has_sensitive_pii).toBe(true);
      expect(result.sensitive_terms).toContain('email');
    });

    it('is false when nothing sensitive', () => {
      const result = contentExtractor.extract('Just some plain text about dogs and cats');
      expect(result.has_sensitive_pii).toBe(false);
    });
  });

  describe('text cap', () => {
    it('handles very long text without crashing', () => {
      const text = 'x'.repeat(300_000) + ' $99.99';
      const result = contentExtractor.extract(text);
      // Price may or may not be found (depends on truncation), but should not throw
      expect(result).toBeDefined();
    });
  });

  describe('caching', () => {
    it('returns cached result for same URL', () => {
      const text = '$100 item';
      const r1 = contentExtractor.extract(text, 'https://example.com');
      const r2 = contentExtractor.extract('different text', 'https://example.com');
      expect(r2).toBe(r1); // Same reference = cached
    });

    it('extracts fresh after reset', () => {
      contentExtractor.extract('$100', 'https://example.com');
      contentExtractor.reset();
      const r2 = contentExtractor.extract('$200', 'https://example.com');
      expect(r2.max_price).toBe(200);
    });
  });
});
