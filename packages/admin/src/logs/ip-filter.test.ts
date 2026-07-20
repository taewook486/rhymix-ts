/**
 * IP Filter Tests
 */
import { describe, it, expect } from 'vitest';
import { parseIpFilter, matchesIpFilter, parseIpFilterForQuery } from './ip-filter';

describe('ip-filter', () => {
  describe('parseIpFilter', () => {
    it('should parse exact IPv4', () => {
      const result = parseIpFilter('192.168.1.1');
      expect(result).toEqual({
        type: 'exact',
        value: '192.168.1.1',
      });
    });

    it('should parse exact IPv6', () => {
      const result = parseIpFilter('2001:db8::1');
      expect(result).toEqual({
        type: 'exact',
        value: '2001:db8::1',
      });
    });

    it('should parse IPv4 CIDR /24', () => {
      const result = parseIpFilter('192.168.1.0/24');
      expect(result).toEqual({
        type: 'cidr',
        value: '192.168.1.0',
        prefixLength: 24,
      });
    });

    it('should parse IPv6 CIDR /32', () => {
      const result = parseIpFilter('2001:db8::/32');
      expect(result).toEqual({
        type: 'cidr',
        value: '2001:db8::',
        prefixLength: 32,
      });
    });

    it('should return error for invalid syntax', () => {
      const result = parseIpFilter('invalid');
      expect(result).toEqual({
        error: 'Invalid IP address format',
      });
    });

    it('should return error for invalid prefix', () => {
      const result = parseIpFilter('192.168.1.0/abc');
      expect(result).toEqual({
        error: 'Invalid prefix length',
      });
    });

    it('should return error for negative prefix', () => {
      const result = parseIpFilter('192.168.1.0/-1');
      expect(result).toEqual({
        error: 'Invalid prefix length',
      });
    });
  });

  describe('matchesIpFilter', () => {
    it('should match exact IPv4', () => {
      const filter = parseIpFilter('192.168.1.1');
      expect(matchesIpFilter('192.168.1.1', filter)).toBe(true);
      expect(matchesIpFilter('192.168.1.2', filter)).toBe(false);
    });

    it('should match IPv4 CIDR /24', () => {
      const filter = parseIpFilter('192.168.1.0/24');
      expect(matchesIpFilter('192.168.1.1', filter)).toBe(true);
      expect(matchesIpFilter('192.168.1.255', filter)).toBe(true);
      expect(matchesIpFilter('192.168.2.1', filter)).toBe(false);
    });

    it('should match IPv4 CIDR /32 (single IP)', () => {
      const filter = parseIpFilter('192.168.1.1/32');
      expect(matchesIpFilter('192.168.1.1', filter)).toBe(true);
      expect(matchesIpFilter('192.168.1.2', filter)).toBe(false);
    });

    it('should match IPv6 exact', () => {
      const filter = parseIpFilter('2001:db8::1');
      expect(matchesIpFilter('2001:db8::1', filter)).toBe(true);
      expect(matchesIpFilter('2001:db8::2', filter)).toBe(false);
    });

    it('should match IPv6 CIDR /32', () => {
      const filter = parseIpFilter('2001:db8::/32');
      expect(matchesIpFilter('2001:db8::1', filter)).toBe(true);
      expect(matchesIpFilter('2001:db9::1', filter)).toBe(false);
    });

    it('should return false for error filter', () => {
      const filter = { error: 'Invalid' };
      expect(matchesIpFilter('192.168.1.1', filter)).toBe(false);
    });

    it('should handle boundary addresses', () => {
      const filter = parseIpFilter('10.0.0.0/8');
      expect(matchesIpFilter('10.0.0.0', filter)).toBe(true);
      expect(matchesIpFilter('10.255.255.255', filter)).toBe(true);
      expect(matchesIpFilter('11.0.0.0', filter)).toBe(false);
    });
  });

  describe('parseIpFilterForQuery', () => {
    it('should return value for exact IPv4', () => {
      const result = parseIpFilterForQuery('192.168.1.1');
      expect(result.value).toBe('192.168.1.1');
      expect(result.error).toBeUndefined();
    });

    it('should return prefix for IPv4 CIDR', () => {
      const result = parseIpFilterForQuery('192.168.1.0/24');
      expect(result.value).toBe('192.168.1');
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid', () => {
      const result = parseIpFilterForQuery('invalid');
      expect(result.value).toBe('');
      expect(result.error).toBeDefined();
    });
  });
});
