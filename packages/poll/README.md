# @rhymix-ts/poll

Rhymix-TS 투표(설문) 패키지.

투표 참여, 결과 집계, 투표 가능 여부 판정을 담당한다. 관리자 측 투표 관리 기능은 `@rhymix-ts/admin`의 `poll/poll` 서브모듈에 있다.

## 설치

```bash
pnpm add @rhymix-ts/poll
```

## 주요 exports

| export | 설명 |
|---|---|
| `castVote` | 투표 참여 |
| `getPollResults` | 투표 결과 집계 |
| `getUserPollVote` | 특정 회원의 투표 여부 조회 |
| `canUserVote` | 투표 가능 여부 판정 |
| `PollNotFoundError` / `PollAlreadyVotedError` / `PollClosedError` / `PollNotStartedError` | 도메인 에러 클래스 |

## 의존성

- `@rhymix-ts/db`, `zod`
