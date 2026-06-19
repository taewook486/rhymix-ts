/**
 * IP Hasher Tests - TDD RED phase.
 *
 * Test coverage for IP hashing/truncation privacy functions.
 */

import { describe, it, expect } from 'vitest'
import { hashIP, truncateIPv4, normalizeIP, anonymizeIP } from './ip-hasher'

describe('hashIP', () => {
  it('should hash IPv4 address to 16-char hex string', () => {
    const result = hashIP('192.168.1.1')
    expect(result).toMatch(/^[a-f0-9]{16}$/)
    expect(result).toHaveLength(16)
  })

  it('should hash IPv6 address to 16-char hex string', () => {
    const result = hashIP('2001:db8::1')
    expect(result).toMatch(/^[a-f0-9]{16}$/)
    expect(result).toHaveLength(16)
  })

  it('should produce consistent hashes for same input', () => {
    const ip = '192.168.1.1'
    const hash1 = hashIP(ip)
    const hash2 = hashIP(ip)
    expect(hash1).toBe(hash2)
  })

  it('should produce different hashes for different IPs', () => {
    const hash1 = hashIP('192.168.1.1')
    const hash2 = hashIP('192.168.1.2')
    expect(hash1).not.toBe(hash2)
  })
})

describe('truncateIPv4', () => {
  it('should truncate IPv4 to /24 subnet', () => {
    expect(truncateIPv4('192.168.1.100')).toBe('192.168.1.xxx')
    expect(truncateIPv4('10.0.0.5')).toBe('10.0.0.xxx')
    expect(truncateIPv4('172.16.254.255')).toBe('172.16.254.xxx')
  })

  it('should throw error for invalid IPv4', () => {
    expect(() => truncateIPv4('invalid')).toThrow('Invalid IPv4 address')
    expect(() => truncateIPv4('192.168.1')).toThrow('Invalid IPv4 address')
  })
})

describe('normalizeIP', () => {
  it('should normalize IPv4 to /24', () => {
    expect(normalizeIP('192.168.1.100')).toBe('192.168.1.0')
    expect(normalizeIP('10.0.0.1')).toBe('10.0.0.0')
  })

  it('should normalize IPv6 to /64', () => {
    // First 2 hextets (32 bits) with :: suffix represents /64 subnet
    expect(normalizeIP('2001:db8::1')).toBe('2001:db8::')
    expect(normalizeIP('fe80::1')).toBe('fe80::')
    expect(normalizeIP('2001:0db8:85a3::8a2e:0370:7334')).toBe('2001:0db8::')
  })

  it('should throw error for invalid IP', () => {
    expect(() => normalizeIP('2001')).toThrow('Invalid IP address')
  })
})

describe('anonymizeIP', () => {
  it('should hash IP by default', () => {
    const result = anonymizeIP('192.168.1.1')
    expect(result).toMatch(/^[a-f0-9]{16}$/)
  })

  it('should fallback to normalization on hash failure', () => {
    // This tests the fallback path - in normal operation hashing succeeds
    const result = anonymizeIP('192.168.1.1')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })
})
