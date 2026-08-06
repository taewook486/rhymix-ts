# @rhymix-ts/page

Rhymix-TS 정적 페이지 모듈 패키지.

자유게시판이 아닌 단일 페이지(회사소개, 이용약관 등) 콘텐츠를 관리하는 모듈이다.

## 설치

```bash
pnpm add @rhymix-ts/page
```

## 주요 exports

| export | 설명 |
|---|---|
| `pageModuleDefinition` | 페이지 모듈 정의 |
| `loadPageContent` / `savePageContent` | 페이지 콘텐츠 조회·저장 |
| `sanitizePageBody` | 본문 HTML sanitize |
| `pageConfigSchema` / `defaultPageConfig` / `parsePageConfig` | 페이지 설정 스키마 |
| `PageBody` | 페이지 본문 렌더 컴포넌트 |

## 의존성

- `@rhymix-ts/core`, `isomorphic-dompurify`, `react`, `zod`
