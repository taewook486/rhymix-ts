/**
 * 미들웨어 rewrite 동작 검증용 echo 라우트 — REQ-INSTALL-012.
 *
 * 미들웨어가 `/api/install/_rewrite_test/*`를 잠금 상태에서도 통과시키므로
 * 진단 단계에서 안전하게 호출할 수 있습니다. 응답 헤더에 nonce를 그대로
 * 되돌려주어, 클라이언트가 라우팅 파이프라인이 살아있는지 확인합니다.
 */
type Ctx = { params: Promise<{ nonce: string }> };

async function echo(ctx: Ctx): Promise<Response> {
  const { nonce } = await ctx.params;
  return new Response('', {
    status: 200,
    headers: { 'x-install-rewrite-nonce': nonce },
  });
}

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  return echo(ctx);
}

export async function HEAD(_req: Request, ctx: Ctx): Promise<Response> {
  return echo(ctx);
}
