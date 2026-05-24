/**
 * Middleware rewrite ping 엔드포인트 — REQ-INSTALL-012.
 *
 * `runEnvDiagnostics`의 `checkMiddlewareRewrite` 검사가 HEAD 요청을 보내면
 * nonce 값을 `x-install-rewrite-nonce` 헤더로 반환합니다. 응답이 정상이면
 * 미들웨어 rewrite 체인이 올바르게 동작한다는 증거입니다.
 *
 * 경로: /install/_rewrite_test/{nonce}
 * 메서드: HEAD (또는 GET — fetch HEAD 시 body 생략)
 *
 * @MX:NOTE: [AUTO] install gate bypass 경로 (/install/*) 에 포함되어 미설치 상태에서도 접근 가능.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-012
 */
import { NextResponse } from 'next/server';

export function HEAD(
  _request: Request,
  { params }: { params: Promise<{ nonce: string }> },
): Promise<NextResponse> {
  return params.then(({ nonce }) => {
    const safeNonce = nonce.slice(0, 64).replace(/[^a-z0-9]/gi, '');
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('x-install-rewrite-nonce', safeNonce);
    return response;
  });
}

// GET도 지원 — fetch가 HEAD를 fallback으로 GET 사용할 수 있는 경우 대비.
export function GET(
  _request: Request,
  { params }: { params: Promise<{ nonce: string }> },
): Promise<NextResponse> {
  return params.then(({ nonce }) => {
    const safeNonce = nonce.slice(0, 64).replace(/[^a-z0-9]/gi, '');
    const response = NextResponse.json({ ok: true });
    response.headers.set('x-install-rewrite-nonce', safeNonce);
    return response;
  });
}
