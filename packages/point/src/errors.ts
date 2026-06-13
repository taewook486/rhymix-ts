// SPEC-POINT-001 에러 클래스

export class PointAmountInvalidError extends Error {
  readonly code = 'POINT_AMOUNT_INVALID';
  constructor(amount: unknown) {
    super(`Invalid point amount: ${amount}`);
  }
}

export class PointMemberNotFoundError extends Error {
  readonly code = 'POINT_MEMBER_NOT_FOUND';
  constructor(memberId: number) {
    super(`Member not found: ${memberId}`);
  }
}

export class PointInsufficientError extends Error {
  readonly code = 'POINT_INSUFFICIENT';
  constructor(balance: number, requested: number) {
    super(`Insufficient points: balance=${balance}, requested=${requested}`);
  }
}

export class PointDuplicateSourceError extends Error {
  readonly code = 'POINT_DUPLICATE_SOURCE';
  constructor(sourceType: string, sourceId: number) {
    super(`Duplicate point source: ${sourceType}/${sourceId}`);
  }
}
