# @rhymix-ts/tag

Rhymix-TS 태그 시스템 패키지.

문서에 태그를 붙이고, 자동완성·태그 클라우드·병합·이름변경 등 태그 관리 기능을 제공한다. UI 컴포넌트(`TagInput`, `TagDisplay` 등)는 `@rhymix-ts/board`에 있다.

## 설치

```bash
pnpm add @rhymix-ts/tag
```

## 주요 exports

| export | 설명 |
|---|---|
| `upsertTagsOnDocument` | 문서에 태그 등록/갱신 |
| `getAutocompleteTags` | 태그 자동완성 후보 조회 |
| `getTagCloud` | 태그 클라우드 (사용 빈도순) |
| `listTags` | 태그 목록 조회 |
| `mergeTags` / `renameTag` / `deleteTag` | 태그 관리 (병합/이름변경/삭제) |
| `TagNotFoundError` / `TagAlreadyExistsError` | 도메인 에러 클래스 |

## 의존성

- `@rhymix-ts/db`, `zod`
