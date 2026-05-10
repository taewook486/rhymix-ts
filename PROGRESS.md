# Rhymix-TS 진행 상황

> 마지막 갱신: 2026-05-10 12:00 (Asia/Seoul)
> 현재 브랜치: `main`

## 한 줄 요약

Rhymix CMS의 TypeScript + Next.js 16 풀스택 재설계. 5개 SPEC 작성 완료, 모노레포 부트스트랩 완료, **SPEC-INSTALL-001 핵심 슬라이스(A·B·C·D·E-core·E-followup) 모두 완료** — 위저드 1→4단계 + 410 잠금 + SiteLock + HSTS + Playwright E2E **7/7 통과**. 선택적 마무리(E-snake) + 다음 SPEC(AUTH/ADMIN/CONTENT/THEME) 대기 중.

## SPEC 진행 현황

| SPEC | 우선순위 | 상태 |
|---|---|---|
| [SPEC-INSTALL-001](.moai/specs/SPEC-INSTALL-001/spec.md) | P0 | **구현 100% 핵심 / 90% 최종** (E-snake 선택) |
| [SPEC-ADMIN-001](.moai/specs/SPEC-ADMIN-001/spec.md) | P0 | draft (계획 완료, 구현 대기) |
| [SPEC-AUTH-001](.moai/specs/SPEC-AUTH-001/spec.md) | P0 | draft (계획 완료, 구현 대기) |
| [SPEC-CONTENT-001](.moai/specs/SPEC-CONTENT-001/spec.md) | P0 | draft (계획 완료, 구현 대기) |
| [SPEC-THEME-001](.moai/specs/SPEC-THEME-001/spec.md) | P1 | draft (계획 완료, 구현 대기) |

## SPEC-INSTALL-001 슬라이스 진행 상황

```
🟢 슬라이스 A         테스트 인프라 + Argon2id + Zod 스키마          (커밋 6b111d2)
🟢 슬라이스 B         환경 진단 + middleware + check-env             (커밋 8b82fbd, b0b5f76)
🟢 슬라이스 C         wizard session + license + db-config           (커밋 a6e0185)
🟢 슬라이스 D         performInstall + Prisma seed + advisory lock   (커밋 c6f4e3f, f84b158)
🟢 슬라이스 E-core    SiteLock 503 + HSTS + middleware→proxy.ts      (커밋 446e6c5)
🟢 슬라이스 E-followup Playwright E2E (3 spec / 7 tests)              (커밋 c414dea, 3bbdd8f)
⏸️ 슬라이스 E-snake   Prisma 컬럼 @map snake_case 정리 (선택적)
```

### 누적 메트릭

- **Vitest**: 148 / 148 통과 + 1 skipped (DB 통합 1건)
- **Playwright E2E**: **7 / 7 통과** (12.9초)
- **커버리지**: 96%+ (모든 슬라이스 surface area, 임계 85% 충족)
- **타입체크**: 5개 워크스페이스 모두 클린 (`pnpm typecheck`)
- **수동 스모크 검증**: 위저드 1→4단계 + /install/complete + /admin placeholder 모두 통과
- **DB 검증**: sites/users/module_instances 모두 시드됨 (admin / is_admin=t / status=APPROVED, mid: notice/qna/board)

### EARS 커버리지

| REQ | 검증 위치 |
|---|---|
| REQ-INSTALL-001 | `proxy.test.ts` — /install 리다이렉트 + `install-happy-path.spec.ts` |
| REQ-INSTALL-002 | `site-status.test.ts` — 4가지 상태 조합 |
| REQ-INSTALL-003 | `wizard-session` — Server Actions origin check 의존 |
| REQ-INSTALL-004 | `wizard-log.test.ts` — ring buffer + FIFO + HMR |
| REQ-INSTALL-005 | `wizard-session` — production secure 쿠키 |
| REQ-INSTALL-010 | check-env page Korean 라벨 (수동 + happy-path) |
| REQ-INSTALL-011 | `agreeLicense action` + `install-happy-path.spec.ts` |
| REQ-INSTALL-012 | `diagnostics.test.ts` — 13 케이스 + 1.5s 타임아웃 |
| REQ-INSTALL-013 | `validateDbConnection` — 5가지 케이스 + happy-path |
| REQ-INSTALL-014 | `seed.test.ts` + `actions.test.ts` performInstall + happy-path 트랜잭션 검증 |
| REQ-INSTALL-015 | `seed.test.ts` 에러 전파 + `actions.test.ts` 락 해제 |
| REQ-INSTALL-020 | `proxy.test.ts` — 미설치 통과 |
| REQ-INSTALL-021 | `wizard-guards` — license 게이트 |
| REQ-INSTALL-022 | `wizard-guards` — env-check + db 게이트 |
| REQ-INSTALL-023 | `proxy.test.ts` 410 + `reinstall-blocked.spec.ts` |
| REQ-INSTALL-024 | `proxy.test.ts` 5 케이스 + `sitelock.spec.ts` 3 케이스 |
| REQ-INSTALL-040 | `proxy.test.ts` HSTS + `headers.test.ts` |
| REQ-INSTALL-042 | `seed.test.ts` SiteSetting `install_lock` 검증 |
| REQ-INSTALL-050 | `wizard-log` Prisma import 없음 + 검증자 transient 테이블만 |
| REQ-INSTALL-052 | `diagnostics`, `wizard-session` — NEXTAUTH_SECRET <32 |
| REQ-INSTALL-053 | `lock.test.ts` 3 unit + 1 integration + `actions.test.ts` |
| REQ-INSTALL-054 | `disposable-email.test.ts` 6 + `actions.test.ts` 2 (prod block / dev pass) |

## 환경 셋업 메모 (다음 세션 재개 시 참고)

### 1. PowerShell PATH 갱신 (새 창마다)

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")
pnpm --version  # 9.15.0 또는 11.x
```

### 2. Docker 컨테이너

| 컨테이너 | 포트 | 용도 |
|---|---|---|
| `rhymix-ts-db` | host **5444** → container 5432 | Rhymix-TS Postgres 16 |
| `rhymix-app` | 8080 | 원본 Rhymix v2.1.32 (참조용) |
| `rhymix-db` | 3307 | 원본 Rhymix MariaDB 10.11 |

호스트 5432는 **Windows의 PostgreSQL 18 서비스**가 점유 중이라 우리는 5444 사용.

```powershell
docker ps --filter "name=rhymix-ts-db"
docker start rhymix-ts-db    # 멈춰있으면
```

### 3. 환경변수 파일

- `D:\project\rhymix-ts\.env.local` — 루트
- `D:\project\rhymix-ts\apps\web\.env.local` — Next.js dev 서버 + Playwright config가 읽음
- `D:\project\rhymix-ts\packages\db\.env` — Prisma CLI가 읽음 (DATABASE_URL만)

세 파일 모두 git ignore. DATABASE_URL: `postgresql://rhymix:rhymix@127.0.0.1:5444/rhymix_ts?schema=public`.

### 4. dev 서버

```powershell
cd D:\project\rhymix-ts
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Recurse -Force apps\web\.next\dev -ErrorAction SilentlyContinue
pnpm dev
```

### 5. 테스트 실행

```powershell
pnpm test                # 148 / 148 통과 + 1 skipped
pnpm test:coverage       # 커버리지 리포트
pnpm typecheck           # 5개 패키지 타입 검증

# E2E (chromium 1회 다운로드 필요)
cd apps\web && pnpm exec playwright install chromium && cd ..\..
pnpm test:e2e            # 7 / 7 통과
```

### 6. 설치 완료된 DB 상태 확인

```powershell
docker exec -it rhymix-ts-db psql -U rhymix -d rhymix_ts
# 안에서:
SELECT id, "timeZone", scheme, "installedAt" IS NOT NULL AS done FROM sites;
SELECT "userId", "isAdmin", status FROM users;
SELECT mid, module FROM module_instances ORDER BY id;
\q
```

기대: sites 1행, users 1행 (admin/APPROVED), module_instances 3행 (notice/qna/board).

### 7. 위저드 다시 진행 (DB 초기화 필요 시)

```powershell
docker exec -it rhymix-ts-db psql -U rhymix -d rhymix_ts -c \
  'TRUNCATE TABLE "MemberGroupMember", "MemberGroup", "ModuleInstance", "ModuleConfig", "SiteSetting", "Domain", "Site", "User" RESTART IDENTITY CASCADE;'
```

(또는 Playwright `db-reset.ts` 호출)

## Git 커밋 히스토리

| Hash | 메시지 |
|---|---|
| `0f4a8ed` | chore: bootstrap rhymix-ts workspace with initial SPECs |
| `9e57976` | chore: scaffold pnpm + turbo monorepo |
| `ebb52d8` | chore: bootstrap dev environment + augment SPECs |
| `6b111d2` | feat(install): slice A — test infra + Argon2id + schemas |
| `8b82fbd` | feat(install): slice B — env diagnostics + middleware |
| `b0b5f76` | fix(install): slice B smoke fixes |
| `a6e0185` | feat(install): slice C — wizard session + db-config |
| `d88c86f` | docs: PROGRESS.md (slice C 시점 스냅샷) |
| `c6f4e3f` | feat(install): slice D — performInstall + seed + lock |
| `f84b158` | fix(install): slice D smoke — 6 patches |
| `446e6c5` | feat(install): slice E-core — SiteLock + HSTS + proxy.ts |
| `c414dea` | feat(install): slice E-followup — Playwright E2E |
| `3bbdd8f` | fix(install): slice E-followup smoke — env loader + drop runtime |

## 알려진 이슈 / Open Questions

1. **CSRF 명시 토큰 미적용** — Server Actions origin check에 의존. 명시 double-submit token은 SPEC-AUTH-001에서 같이 정리.
2. **middleware 매 요청 DB hit** — `cache()`는 요청 단위. 설치는 비가역적이므로 모듈 스코프 메모이제이션 가능 (선택적 최적화).
3. **Prisma `db:generate` Windows EPERM** — query engine .dll 파일 락 가끔 발생. dev 서버 끄고 재실행하면 해결.
4. **`@prisma/client can't be external` 경고** — Turbopack monorepo 경고. 동작 영향 없음. `serverExternalPackages: ['@prisma/client', 'pg']` 이미 설정.
5. **Prisma 컬럼명 camelCase** — `@@map("table")`만 적용되고 컬럼은 그대로 PascalCase/camelCase. SQL 작성 시 따옴표 필요. **Slice E-snake에서 `@map`으로 정리 예정**.
6. **CIDR / IPv6 prefix 매칭** — SiteLock allowlist는 정확 문자열 매치만. 향후 확장.
7. **자동 로그인 미적용** — `/install/complete` → 사용자가 수동 로그인. SPEC-AUTH-001에서 `signIn()` 통합.

## 다음 세션 재개 절차

1. PowerShell PATH 갱신
2. `cd D:\project\rhymix-ts`
3. `docker start rhymix-ts-db`
4. `pnpm test` → 148 회귀 검증
5. 다음 작업 선택:
   - **Slice E-snake** (Prisma 컬럼 @map 정리, ~30분)
   - **SPEC-AUTH-001** (Auth.js Credentials provider + /login 구현)
   - **SPEC-ADMIN-001** (관리자 대시보드 실 구현)
   - **SPEC-CONTENT-001** (게시판/문서/댓글)
   - **SPEC-THEME-001** (테마/레이아웃/스킨)

## 권장 다음 SPEC 순서

위저드 완성 → 즉시 가치 큰 순서:

1. **SPEC-AUTH-001** — `/login` 이 placeholder라 admin 로그인 불가. Credentials provider 구현 1순위.
2. **SPEC-ADMIN-001** — 모듈 인스턴스 관리 UI. `/admin` placeholder 채우기.
3. **SPEC-CONTENT-001** — 게시판/문서. 시드된 notice/qna/board를 실제 사용.
4. **SPEC-THEME-001** — 테마/레이아웃. 마지막 레이어.

각 SPEC도 슬라이스로 쪼갤 가능성 높음 (manager-tdd가 자체 판단).

---

**SPEC-INSTALL-001 핵심 완성. 다음 세션부터 SPEC-AUTH-001 권장.**
