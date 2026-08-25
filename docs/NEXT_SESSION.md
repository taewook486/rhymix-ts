# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-25 (미검증분 1건 해소 + 지난 세션 D3 의 남은 절반 마감.
>       `2427ef4` + `3a3c53f`. 트리 clean, `0 0`)
> source_session_id: e51e0873-1b6b-4f6c-a84f-ce43c7c61269

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. rhymix-ts — packages/document/src/server 테스트 작성부터.

전제 검증:
1) git rev-list --count --left-right origin/main...HEAD → 0 0
2) Docker Desktop 켜고 `docker start rhymix-ts-db` → 3개 컨테이너 기동
   (Desktop 을 켜도 rhymix-ts-db 는 자동 기동 안 될 때가 있다)
3) 코드 수정 후에는 apps/web 에서 dev 서버 재기동
   — /mnt/d 는 inotify 미작동이라 재기동해야 반영된다. 콜드 200초.

실행: packages/document/src/server 의 router.ts(347행) + actions.ts(236행)
      테스트 작성. packages/file/src/server 를 본으로 삼을 것. 전량 0% 다.

후속: 남은 후보는 packages/admin 린트 구성, 주 DB 재시드 판단, 잔여 worktree 정리.

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-08-25)

지난 세션이 남긴 미검증 1건을 닫으려다, 같은 결함의 **안 고쳐진 절반**을 찾아
같이 마감했다.

### 1. IndexModuleForm select 갱신 (`2427ef4`) — 미검증분 해소

실제 브라우저로 확인한 결과 **저장 직후 갱신은 정상 동작**한다. 다만 지난
세션이 붙인 `useEffect` + `router.refresh()` 는 두 가지로 잘못돼 있었다.

- 의존성이 `state.success`(불리언)라 **두 번째 연속 저장에서 `true → true`** 로
  값이 안 바뀌어 effect 가 다시 돌지 않았다. 의도대로 동작한 적이 없다.
- 동작하더라도 Server Action 의 `revalidatePath` 와 중복이라 저장마다 RSC 요청이
  하나 더 뜨고 곧바로 abort 된다.

실제로 고치는 것은 **select 의 `key` remount 하나뿐**이었다. uncontrolled select 는
`defaultValue` 만 바뀌어서는 화면이 안 바뀌므로 현재값을 `key` 에 넣어 remount
시켜야 한다. effect 는 제거했다 (12줄 삭제 / 5줄 추가).

검증: 2 → 3, 이어 3 → 2 두 번 연속 저장 모두 새로고침 없이 즉시 갱신,
새로고침 후 유지, 콘솔 에러 0건.

### 2. 작성자 스냅샷 (`3a3c53f`) — 지난 세션 D3 의 남은 절반

지난 세션은 `handleCreateDocumentForm` 에서 nickName 을 조회하도록 고쳤는데,
`createDocument` 호출자는 그 하나가 아니었다.

| 호출자 | 수정 전 상태 |
|---|---|
| `packages/board` handleCreateDocumentForm | 지난 세션에 수리됨 |
| `apps/web/server/api/routers/content/document.ts:188` | `nickName: null` 그대로 → 작성자 `-` |
| `packages/document/src/server/router.ts:245` | `nickName: null` 그대로 → 작성자 `-` |

즉 **API 로 쓴 글은 여전히 작성자가 `-` 였다.**

`userIdSnapshot` 은 어느 경로에서도 안 채웠다. 작성자 검색(`listDocuments`)이
`nickName OR userIdSnapshot` 을 보므로 **로그인 ID 로는 검색이 전혀 안 됐다.**

→ 호출자마다 채우면 또 빠뜨리므로 **단일 관문인 `createDocument`** 로 옮겼다.
`authorId` 가 있으면 User 를 한 번 조회해 nickName(명시값 우선)과 userIdSnapshot
을 채운다. 비회원 글은 넘어온 nickName 을 그대로 쓴다.

### 문서 정정 — 이 문서의 기존 서술 1건이 틀렸다

- **"`userIdSnapshot` 스키마 확장 필요"는 사실이 아니다.** `schema.prisma` 의
  Document(812행) / Comment(873행) 에 이미 있다. 없던 건 **채우는 코드**뿐이다.
  (스키마 마이그레이션을 계획했다면 헛수고였다.)

## 검증 방법론 메모 (계속 유효 + 이번 추가분)

- **mock 테스트 통과는 새 경로를 탔다는 증거가 아니다.** `createDocument` 에
  `prisma.user.findUnique` 를 추가한 뒤에도 기존 51건이 그대로 통과했다.
  mock 이 undefined 를 반환해 새 분기를 건너뛰었기 때문이다. 그래서 실 DB 로
  확인했다 — 수정 전 문서 2건은 `userIdSnapshot` 이 비어 있고 수정 후 작성한
  3번만 채워져 **전후 대조가 성립**한다.
- **"고쳤다"의 범위를 호출자 수로 확인할 것.** D3 는 호출자 3곳 중 1곳만
  고쳐진 채 "수리됨"으로 기록돼 있었다. 도메인 함수를 고칠 땐
  `grep -rn "함수명(" ` 로 호출자를 전부 세고 시작하는 게 싸다.
- **수정 직후 첫 검증이 거짓 음성일 수 있다** — `/mnt/d` inotify 미작동.
  재기동 없이 "고쳤다"고 판단하면 틀린 보고가 된다.
- Playwright 에서 `button[type="submit"]` 은 헤더의 **로그아웃 버튼**을 먼저
  잡는다. `getByRole('button', { name: ... })` 로 특정할 것.
- `networkidle` 은 Next dev 의 HMR 웹소켓 때문에 **절대 안정되지 않는다**.
  URL 조건 대기를 쓸 것.
- 로그인 직후 간헐적으로 뜨는 next-auth `ClientFetchError: Failed to fetch` 는
  네비게이션이 in-flight `/api/auth/session` 을 끊어서 나는 것이다. 제품 결함이
  아니고 재현도 들쭉날쭉하다(4회 중 2회).

## 로그인 자격증명 (로컬 dev DB)

`admin` / `Admin1234!`

## 현재 DB 상태 (검증용 데이터)

- 게시판 2개: `notice`(공지사항, id=2) / `free`(자유게시판, id=3)
- 문서 3건 — 3번은 이번 세션 검증용(`스냅샷검증-...`), 지워도 무방
- 도메인 인덱스 모듈은 마지막 실행 기준 `free`(id=3)

## 후보 작업 (전부 선택적)

- **packages/document/src/server 테스트** — 다음 작업. `router.ts`(347행)
  + `actions.ts`(236행) 전량 0%. `packages/file/src/server` 를 본으로 삼을 것.
- **`packages/admin` 린트 구성** — 현재 `"lint": "echo 'no lint'"`.
- **주 DB 재시드 판단** — 지금 데이터는 e2e 시드 + 검증용 게시판/글이다.
- **잔여 worktree 정리**: `.claude/worktrees/agent-a09e6b3213e201359/`.

## 환경 함정 (계속 유효 + 이번 추가분)

- **`moai gate` pre-commit 은 전체 vitest 스위트를 돌린다.** 7분 넘겨도 안 끝나고
  죽이면 vitest 고아 프로세스가 남는다. 커밋 전 `ps -eo pid,cmd | grep vitest`
  로 확인하고 정리할 것. 범위에 맞는 검증을 직접 하고
  `SKIP_MOAI_PRECOMMIT=1` + 사유를 커밋 본문에 남기는 게 이 저장소의 규약이다.
- **`moai` 바이너리가 2개다.** PATH 는 2.14.0(`gate` 없음 → `unknown command`),
  `~/.local/bin` 은 3.1.2. 3.1.2 를 쓰면 gate 는 실행되지만 위 문제로 느리다.
- **Docker Desktop 은 WSL 에서 켤 수 있다**:
  `nohup "/mnt/c/Program Files/Docker/Docker/Docker Desktop.exe" &`.
  켜도 **`rhymix-ts-db` 는 Exited 로 남을 수 있으니 `docker start rhymix-ts-db`**.
  `/usr/bin/docker` 심볼릭 링크가 깨져 보이면 Desktop 이 꺼진 것이다.
- **`/mnt/d` 는 inotify 미작동 → 코드 수정 후 dev 서버 재기동 필수.**
  `.next/dev/lock` 먼저 제거. 콜드 컴파일 ~200초, 라우트별 첫 요청 30~110초.
- **`pgrep -f "next[ ]dev"` 도 자기 자신을 잡는다**(exit 144). PID 를 먼저
  `ps -eo pid,cmd | grep -F "next/dist/bin/next"` 로 뽑아 `kill <pid>` 할 것.
  `kill -9` 와 `pkill -9` 는 가드에 막힌다.
- **`.git/index.lock` 은 `moai statusline` 이 만든다.** 어제 날짜 stale 락이
  남아 있기도 하다. `ps` 로 살아있는 git 프로세스가 없으면 그냥 `rm` 할 것.
- **`npx` 가 Windows 바이너리로 잡힌다.** 매 Bash 앞에
  `export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"`, 도구는
  `node_modules/.bin/<tool>` 직접 지목. next 는 `apps/web/node_modules/.bin/next`.
- **foreground `sleep` 은 막혀 있다.** 대기는 `curl --retry N --retry-delay S
  --retry-connrefused` 로 대체하는 게 제일 깔끔하다.
- **vitest `--reporter=line` 은 이 설정에서 안 먹는다**(커스텀 리포터로 오인).
  `--reporter=verbose` 또는 `--reporter=dot`.
- **커밋은 명시 pathspec 으로만.** 미커밋 400+ 하네스 템플릿 상주 — `git add -A` 금지.
- **docker**: rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444).
  WSL 에서 안 잡히면 Docker Desktop 의 WSL2 통합을 켤 것.
