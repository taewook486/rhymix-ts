# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-09 21:20 KST / source_session_id: 320846fe-da55-4d8b-baba-7909bd6ed757

## 붙여넣을 메시지

```text
ultrathink. SPEC-CONTENT-PARITY-001 run 진행 (M6부터).
applied lessons: feedback-cg-mode-path-corruption, feedback-stale-git-index-lock, project-setup

전제 검증:
1) docker.exe ps -a → rhymix-app/rhymix-db/rhymix-ts-db 존재 확인, Exited면 docker.exe start <name>
2) curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ → 200 (아니면 pnpm --filter web dev 백그라운드 기동)
3) git log --oneline -1 → 5266612이거나 그 이후 SHA (main==origin/main 상태여야 함)
4) git status --porcelain → 비어있어야 함(M1~M5 전부 커밋+push 완료 상태)

Run: /moai run SPEC-CONTENT-PARITY-001 (M6: 관리자 알림 매트릭스부터)

After merge: M7(메일 발송 로그) 진행 후 sync-phase(/moai sync SPEC-CONTENT-PARITY-001)
```

## 현재 상태 (2026-08-09 최종)

- **완료·push됨**: M1(사이드바 재구성) `80b034c`, M2(휴지통) `5062c70`, M3(문서·댓글 배선) `e911afc`+`04e4eaa`, M4(파일 목록) `bcdc4cb`+`768e110`, M5(모듈 편집+per-board 링크) `5266612`. main == origin/main(`5266612`). 작업 트리 clean.
- **미착수**: M6(관리자 알림 매트릭스, web 채널만 확정), M7(메일 발송 로그 — MailLog 모델+마이그레이션 포함, 본 SPEC에 포함 확정).
- **잔여 부채(문서화됨, progress.md 참고)**: M2/M3/M4/M5의 일부 AC가 `PASS-WITH-DEBT` — mock-tRPC 단위 테스트로만 검증되고 실제 브라우저+dev DB reload-persistence 재현은 미수행. 별도 회귀 없이 정상 진행 가능하나, sync-phase 전에 한 번 실브라우저 확인 권장.
- M5에서 기존 `admin.module.update` 프로시저의 실제 버그(`title`→Prisma에 `data.title`로 전달되지만 모델 필드는 `name`)를 발견·수정함 — M5 편집 폼이 해당 프로시저의 첫 실제 호출부였음.

## 환경 재현 (다른 컴퓨터 첫 실행 시)

- Node: nvm 사용 — 매 Bash 앞에 `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"`
- Docker Desktop 미기동 상태일 수 있음 → Windows에서 `Docker Desktop.exe` 실행 후 데몬 준비까지 대기
- 컨테이너: `rhymix-app`(레거시 PHP, :8080), `rhymix-db`(MariaDB, :3307), `rhymix-ts-db`(Postgres, :5444) — 꺼져있으면 `docker.exe start <name>`
- 뉴버전 dev 서버: `pnpm --filter web dev` (포트 3000). DB는 이미 설치 완료 상태(`prisma migrate reset` 불필요 — 이미 seed됨)
- WSL2에서 `.git/index.lock`이 활성 프로세스 없이 남아있는 경우가 잦음 — `ps aux | grep git`으로 확인 후 `rm -f .git/index.lock`

## SPEC 참고

- 산출물: `.moai/specs/SPEC-CONTENT-PARITY-001/{spec.md,plan.md,acceptance.md,design.md,research.md,progress.md}`
- research.md §2에 레거시 admin '콘텐츠' 메뉴 11개 화면 전수 인벤토리 있음(재조사 불필요)
- M1~M7 전부 main 직접 커밋(Hybrid Trunk 1인 OSS 방식) — PR 없음
