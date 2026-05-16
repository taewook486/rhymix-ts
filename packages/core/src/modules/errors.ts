/**
 * errors.ts — SPEC-ADMIN-001 Slice A
 *
 * 모듈 시스템 도메인 에러 정의.
 * 각 에러는 명시적인 클래스로 정의하여 instanceof 로 구분 가능.
 */

/** mid 패턴 위반 (길이 또는 문자 패턴 오류) */
export class MidInvalidError extends Error {
  readonly code = 'INVALID_PATTERN' as const;
  constructor(mid: string) {
    super(`mid "${mid}" 은 유효하지 않은 패턴입니다 (^[a-z0-9][a-z0-9_-]*$, 1-80자).`);
    this.name = 'MidInvalidError';
  }
}

/** mid 길이 위반 */
export class MidLengthError extends Error {
  readonly code = 'INVALID_LENGTH' as const;
  constructor(mid: string) {
    super(`mid "${mid}" 의 길이가 유효하지 않습니다 (1-80자).`);
    this.name = 'MidLengthError';
  }
}

/** mid 예약어 충돌 */
export class MidReservedError extends Error {
  readonly code = 'RESERVED_KEYWORD' as const;
  constructor(mid: string) {
    super(`mid "${mid}" 은 예약어입니다.`);
    this.name = 'MidReservedError';
  }
}

/** mid 사이트 내 중복 (DB unique 위반) */
export class MidConflictError extends Error {
  readonly code = 'CONFLICT' as const;
  constructor(siteId: number, mid: string) {
    super(`사이트 ${siteId} 에 mid "${mid}" 인스턴스가 이미 존재합니다.`);
    this.name = 'MidConflictError';
  }
}

/** 도메인의 indexModuleInstanceId 로 지정된 인스턴스 삭제 불가 (REQ-ADMIN-006) */
export class IndexModuleProtectedError extends Error {
  readonly code = 'INDEX_MODULE_PROTECTED' as const;
  constructor(instanceId: number) {
    super(
      `인스턴스 ${instanceId} 는 한 개 이상의 도메인의 인덱스 모듈로 지정되어 있어 삭제할 수 없습니다.` +
      ' 다른 인덱스 모듈을 지정한 후 다시 시도하세요.',
    );
    this.name = 'IndexModuleProtectedError';
  }
}

/** 레지스트리에 등록되지 않은 moduleCode 조회 시 */
export class ModuleNotRegisteredError extends Error {
  readonly code = 'MODULE_NOT_REGISTERED' as const;
  constructor(moduleCode: string) {
    super(`모듈 "${moduleCode}" 는 레지스트리에 등록되지 않았습니다.`);
    this.name = 'ModuleNotRegisteredError';
  }
}

/** 동일 moduleCode 중복 등록 시 */
export class DuplicateModuleError extends Error {
  readonly code = 'DUPLICATE_MODULE' as const;
  constructor(moduleCode: string) {
    super(`모듈 "${moduleCode}" 는 이미 등록되어 있습니다.`);
    this.name = 'DuplicateModuleError';
  }
}
