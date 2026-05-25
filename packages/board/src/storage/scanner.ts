/**
 * VirusScanner 구현체 — SPEC-CONTENT-001 Slice E
 *
 * @MX:NOTE [AUTO]: NoopScanner 는 Slice E 기본값.
 * 운영 환경에서는 ClamAVScanner 로 교체 필요 (SPEC-INFRA-001 이월).
 */
import type { VirusScanner } from './types';

/**
 * NoopScanner — 항상 clean: true 반환.
 * Slice E 기본값. 운영 환경에서는 ClamAVScanner 로 교체.
 *
 * @MX:TODO [AUTO]: 운영 환경에서는 ClamAVScanner 로 교체 필수 (SPEC-INFRA-001).
 */
export class NoopScanner implements VirusScanner {
  async scan(_input: {
    storageKey: string;
    storage: unknown;
    knownContentType: string;
    knownSize: number;
  }): Promise<{ clean: true; scannedAt: Date }> {
    return { clean: true, scannedAt: new Date() };
  }
}

/**
 * FakeMalwareScanner — 테스트용. 항상 unclean 반환.
 * A-9 테스트 (virus 검출 시 보상 트랜잭션 검증) 에서 사용.
 */
export class FakeMalwareScanner implements VirusScanner {
  async scan(_input: {
    storageKey: string;
    storage: unknown;
    knownContentType: string;
    knownSize: number;
  }): Promise<{ clean: false; threats: string[]; scannedAt: Date }> {
    return { clean: false, threats: ['EICAR-Test-Signature'], scannedAt: new Date() };
  }
}
