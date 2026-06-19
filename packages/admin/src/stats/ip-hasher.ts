/**
 * IP Hashing/Truncation - SPEC-ADMIN-002 REQ-ADMIN2-142.
 *
 * Privacy-preserving IP handling for visit counting.
 * Does NOT store raw PII IP beyond what's needed for daily unique-visitor dedup.
 *
 * @MX:WARN: PII 처리 - 원시 IP를 해시/절단하여 개인정보 노출 최소화 (REQ-ADMIN2-142)
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-142
 */

import { createHash } from 'crypto'

/**
 * Hash IP address using SHA-256 for privacy.
 *
 * @param ip - Raw IP address string (IPv4 or IPv6)
 * @returns Hashed IP (hex string, first 16 chars for storage efficiency)
 *
 * @example
 * hashIP('192.168.1.1') // => 'a1b2c3d4e5f6...'
 */
export function hashIP(ip: string): string {
  const hash = createHash('sha256').update(ip).digest('hex')
  // Store first 16 chars (64 bits) - sufficient for dedup, minimizes storage
  return hash.substring(0, 16)
}

/**
 * Truncate IPv4 address to /24 subnet for privacy (192.168.1.xxx).
 *
 * @param ip - IPv4 address string
 * @returns Truncated IP (last octet replaced with 'xxx')
 * @throws Error if not a valid IPv4 address
 *
 * @example
 * truncateIPv4('192.168.1.100') // => '192.168.1.xxx'
 */
export function truncateIPv4(ip: string): string {
  const parts = ip.split('.')
  if (parts.length !== 4) {
    throw new Error(`Invalid IPv4 address: ${ip}`)
  }
  return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`
}

/**
 * Normalize and truncate IP address (IPv4 or IPv6).
 *
 * - IPv4: Truncate to /24 (last octet masked)
 * - IPv6: Truncate to /64 (last 64 bits masked)
 * - Returns truncated format suitable for dedup without full PII
 *
 * @param ip - Raw IP address string
 * @returns Normalized, truncated IP for daily dedup
 *
 * @example
 * normalizeIP('192.168.1.100') // => '192.168.1.0'
 * normalizeIP('2001:db8::1') // => '2001:db8::' (first 64 bits)
 */
export function normalizeIP(ip: string): string {
  // Detect IPv4 vs IPv6 by checking for colon
  if (ip.includes(':')) {
    // IPv6: truncate to /64 subnet (first 64 bits)
    // Splits on :: and takes segments before it
    const beforeDoubleColon = ip.split('::')[0]

    // Guard: handle empty string (e.g., "::1" produces empty string before ::)
    if (!beforeDoubleColon || beforeDoubleColon.length === 0) {
      // For addresses like ::1, ::ffff:192.0.2.1, treat as invalid for this simple truncation
      throw new Error(`Invalid IPv6 address: ${ip}`)
    }

    const segments = beforeDoubleColon.split(':').filter(s => s.length > 0)

    if (segments.length < 1) {
      throw new Error(`Invalid IPv6 address: ${ip}`)
    }

    // Take up to first 2 segments (represents first 32 bits for /64)
    // With :: suffix, this represents the /64 subnet prefix
    const prefix = segments.slice(0, 2).join(':')
    return prefix + '::'
  } else if (ip.includes('.')) {
    // IPv4: truncate to /24
    const parts = ip.split('.')
    if (parts.length !== 4) {
      throw new Error(`Invalid IPv4 address: ${ip}`)
    }
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`
  } else {
    throw new Error(`Invalid IP address: ${ip}`)
  }
}

/**
 * Hash IP for storage with fallback to truncation.
 *
 * Primary: SHA-256 hash (first 16 chars)
 * Fallback: Truncate to subnet (if hash fails)
 *
 * @param ip - Raw IP address
 * @returns Hashed or truncated IP
 */
export function anonymizeIP(ip: string): string {
  try {
    return hashIP(ip)
  } catch {
    // Fallback to truncation if hashing fails
    return normalizeIP(ip)
  }
}
