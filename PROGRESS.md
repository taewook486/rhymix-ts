# Rhymix-TS 진행 상황

> 마지막 갱신: 2026-05-10 03:00 (Asia/Seoul)
> 현재 브랜치: `main`

## 한 줄 요약

Rhymix CMS의 TypeScript + Next.js 16 풀스택 재설계 프로젝트. 5개 SPEC 작성 완료, 모노레포 부트스트랩 완료, **SPEC-INSTALL-001의 5개 슬라이스 중 A·B·C 완료** (4개 단계 위저드 중 1·2·3단계 동작), Slice D·E 대기 중.

## SPEC 진행 현황

| SPEC | 우선순위 | 상태 |
|---|---|---|
| [SPEC-INSTALL-001](.moai/specs/SPEC-INSTALL-001/spec.md) | P0 | **구현 60% (A·B·C 완료, D·E 대기)** |
| [SPEC-ADMIN-001](.moai/specs/SPEC-ADMIN-001/spec.md) | P0 | draft (계획 완료) |
| [SPEC-AUTH-001](.moai/specs/SPEC-AUTH-001/spec.md) | P0 | draft (계획 완료) |
| [SPEC-CONTENT-001](.moai/specs/SPEC-CONTENT-001/spec.md) | P0 | draft (계획 완료) |
| [SPEC-THEME-001](.moai/specs/SPEC-THEME-001/spec.md) | P1 | draft (계획 완료) |

## SPEC-INSTALL-001 슬라이스 진행 상황

```
🟢 슬라이스 A — 테스트 인프라 + Argon2id + 스키마          (커밋 6b111d2)
🟢 슬라이스 B — 환경 진단 + middleware + check-env         (커밋 8b82fbd, b0b5f76)
🟢 슬라이스 C — wizard session + license + db-config       (커밋 a6e0185)
⏸️ 슬라이스 D — performInstall + Prisma seed + advisory lock
⏸️ 슬라이스 E — SiteLock + Playwright E2E
```

### 누적 메트릭

- **테스트**: 103 / 103 통과
- **커버리지**: 96.15% (전 슬라이스 평균, 임계 85% 충족)
- **타입체크**: 5개 워크스페이스 모두 클린 (`pnpm typecheck`)
- **수동 스모크 검증**: 1·2단계 브라우저 확인 완료. 3단계는 다음 세션에서 검증.

### EARS 커버리지

| REQ | 검증 위치 |
|---|---|
| REQ-INSTALL-001 | `middleware.test.ts` — /install 리다이렉트 |
| REQ-INSTALL-002 | `site-status.test.ts` — 4가지 상태 조합 |
| REQ-INSTALL-003 | `wizard-session` — Server Actions origin check 의존 |
| REQ-INSTALL-004 | `wizard-log.test.ts` — ring buffer + FIFO + HMR |
| REQ-INSTALL-005 | `wizard-session` — production secure 쿠키 |
| REQ-INSTALL-010 | check-env page Korean 라벨 (수동) |
| REQ-INSTALL-011 | `agreeLicense action` — 동의 후 redirect |
| REQ-INSTALL-012 | `diagnostics.test.ts` — 13 케이스 + 1.5s 타임아웃 |
| REQ-INSTALL-013 | `validateDbConnection` — 5가지 케이스 (superuser/auth/unreachable/perm/collision) |
| REQ-INSTALL-020 | `middleware.test.ts` — 미설치 통과 |
| REQ-INSTALL-021 | `wizard-guards` — license 게이트 |
| REQ-INSTALL-022 | `wizard-guards` — env-check + db 게이트 |
| REQ-INSTALL-023 | `middleware.test.ts` — 410 + 진단 우회 |
| REQ-INSTALL-050 | `wizard-log` Prisma import 없음 + 검증자 transient 테이블만 |
| REQ-INSTALL-052 | `diagnostics`, `wizard-session` — NEXTAUTH_SECRET <32 |

## 환경 셋업 메모 (다음 세션 재개 시 참고)

### 1. PowerShell PATH 갱신 (새 창마다)

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")
pnpm --version  # 9.15.0 또는 11.x 표시되어야 함
```

### 2. Docker 컨테이너 상태

| 컨테이너 | 포트 | 용도 |
|---|---|---|
| `rhymix-ts-db` | host **5444** → container 5432 | Rhymix-TS Postgres 16 |
| `rhymix-app` | 8080 | 원본 Rhymix v2.1.32 (참조용) |
| `rhymix-db` | 3307 | 원본 Rhymix MariaDB 10.11 |

호스트 5432는 **Windows의 PostgreSQL 18 서비스**가 점유 중이라 우리는 5444 사용.

```powershell
docker ps                       # 살아있는지 확인
docker start rhymix-ts-db       # 멈춰있으면 시작
```

### 3. 환경변수 파일

- `D:\project\rhymix-ts\.env.local` — 루트, NEXTAUTH 등
- `D:\project\rhymix-ts\apps\web\.env.local` — Next.js dev 서버가 읽는 위치 (루트와 동일 내용 유지)
- `D:\project\rhymix-ts\packages\db\.env` — Prisma CLI가 읽는 위치 (DATABASE_URL만)

세 파일 모두 git ignore. DATABASE_URL은 `postgresql://rhymix:rhymix@127.0.0.1:5444/rhymix_ts?schema=public`.

### 4. dev 서버 띄우기

```powershell
cd D:\project\rhymix-ts
# 잔여 프로세스 정리 (필요 시)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Recurse -Force apps\web\.next\dev -ErrorAction SilentlyContinue

pnpm dev
```

http://localhost:3000 → `/install`로 자동 리다이렉트.

### 5. 테스트 실행

```powershell
pnpm test                # 103 / 103 통과 기대
pnpm test:coverage       # 커버리지 리포트
```

## Git 커밋 히스토리

| Hash | 메시지 |
|---|---|
| `0f4a8ed` | chore: bootstrap rhymix-ts workspace with initial SPECs |
| `9e57976` | chore: scaffold pnpm + turbo monorepo for Rhymix-TS |
| `ebb52d8` | chore: bootstrap dev environment + augment SPECs from Rhymix UX inspection |
| `6b111d2` | feat(install): slice A — test infra + Argon2id + install Zod schemas |
| `8b82fbd` | feat(install): slice B — env diagnostics + middleware + check-env page |
| `b0b5f76` | fix(install): slice B smoke fixes — private folder + monorepo prisma |
| `a6e0185` | feat(install): slice C — wizard session, license action, db-config validation |

## 알려진 이슈 / Open Questions

1. **CSRF 명시 토큰 미적용** — Slice C는 Next.js 16 Server Actions의 origin check에 의존. SPEC-INSTALL-001 REQ-INSTALL-003의 "next-auth-compatible double-submit cookie" 명시적 토큰 패턴은 Slice D 진입 전 도입 검토.
2. **`INSTALL_LOCK` env vs `Site.installedAt` 우선순위** — 현재 OR 조건. SPEC §Mapping 표는 `Site.installedAt` 권위적이라 했지만 게이팅 측면에선 둘 다 안전. Slice D에서 명확화.
3. **middleware 매 요청 DB hit** — `cache()`는 요청 내 캐시. 설치는 비가역적이므로 모듈 스코프 메모이제이션 검토 (Slice D 또는 E).
4. **Prisma `db:generate` Windows EPERM** — `query_engine-windows.dll.node` 파일 락으로 가끔 실패. 재실행으로 해결.
5. **`middleware.ts` deprecated 경고** — Next.js 16에서 `proxy.ts`로 명칭 변경 권장. Slice E 또는 별도 정리에서 진행.
6. **`@prisma/client can't be external` 경고** — Turbopack monorepo 경고. 동작에는 영향 없으나 `apps/web/next.config.ts`에 `serverExternalPackages: ['@prisma/client']` 또는 `transpilePackages` 보강 가능.

## 다음 세션 재개 절차

1. PowerShell PATH 갱신
2. `cd D:\project\rhymix-ts`
3. `docker ps` 확인 → 필요시 `docker start rhymix-ts-db`
4. `pnpm test` 으로 103/103 회귀 없는지 확인
5. `/moai run SPEC-INSTALL-001 --slice D` 또는 자연어로 "슬라이스 D 시작"

## Slice D 사전 준비 (다음 세션 시작 시 필요)

**범위**: `performInstall` server action + Prisma migrate + DB seed + `pg_advisory_lock` + Step 4 (admin-config) UI + `/install/complete` 페이지

**EARS 타겟**: REQ-INSTALL-014, 015, 053

**예상 파일 수**: 12-16

**핵심 결정사항** (다음 세션에서 확정):
- 첫 admin User 생성 시 트랜잭션 범위
- `INSTALL_LOCK` 영구화 위치 (.env.local 쓰기 vs DB row)
- module instance 시드 (`notice`, `qna`, `board`)와 default theme assignment
- Slice D 완료 후 SPEC-AUTH-001 / SPEC-ADMIN-001 / SPEC-THEME-001 어떤 순서로 구현할지

---

**잘 자요. 내일 봬요.** 🌙
