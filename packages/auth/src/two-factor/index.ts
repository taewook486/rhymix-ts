/**
 * SPEC-ADMIN-2FA-OTP-001 — 2FA 서브패키지 진입점.
 *
 * M1/M2 코어(crypto/totp/backup-codes)와 M4 세션 검증 마커를 한 곳에서 노출.
 * 메인 인덱스(`@rhymix-ts/auth`)와 분리된 이유: otplib/qrcode 의존성은
 * 2FA 기능을 쓰는 쪽만 로드해야 하기 때문.
 *
 * @MX:SPEC: SPEC-ADMIN-2FA-OTP-001
 */

export {
  encryptSecret,
  decryptSecret,
} from '../two-factor-crypto';

export {
  generateTotpSecret,
  buildOtpauthUrl,
  verifyTotp,
  generateTotpQrCode,
} from '../two-factor-totp';

export {
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  normalizeBackupCode,
} from '../two-factor-backup-codes';

export {
  registerTwoFactorVerifiedMarker,
  consumeTwoFactorVerifiedMarker,
  __clearTwoFactorVerifiedMarkersForTests,
} from '../two-factor-verified-marker';
