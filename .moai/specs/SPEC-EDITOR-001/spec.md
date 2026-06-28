---
id: SPEC-EDITOR-001
title: WYSIWYG 에디터 통합 (Tiptap 기반 리치 텍스트 편집기)
version: 1.0.0
status: completed
created: 2026-06-27
updated: 2026-06-27
author: MoAI gap-analysis
priority: P0
phase: 3
parent: MASTER-PLAN-002
depends-on:
  - SPEC-BOARD-CRUD-001
  - SPEC-FILE-001
issue_number: TBD
language: ko
---

# SPEC-EDITOR-001 — WYSIWYG 에디터 통합 (Phase 3 / P0)

## HISTORY

- 2026-06-27 (v1.0.0): 최초 작성. 레거시 vs 뉴버전 Gap Analysis(`.moai/reports/gap-analysis-legacy-vs-ts-2026-06-27.md`) 결과 도출. 현재 글쓰기 폼이 plain `<textarea>`로만 구성되어 있어 HTML 서식, 이미지 인라인 삽입, 파일 첨부 등 CMS 핵심 기능이 불가능한 상태. 레거시 Rhymix는 CKEditor 기반 WYSIWYG를 제공하며, 뉴버전은 동등한 수준의 에디터가 필요하다.

---

## 1. Goal & Audience

### 1.1 Goal

**글쓰기/수정 폼에서 리치 텍스트(HTML) 편집이 가능하다** 를 달성한다:

- `Tiptap` v2 (ProseMirror 기반) 에디터를 글쓰기/수정 폼에 통합한다.
- 텍스트 서식(굵게/기울임/밑줄/취소선/색상/배경색/크기)을 툴바에서 적용할 수 있다.
- 이미지를 에디터 내에 인라인으로 삽입할 수 있다 (업로드 또는 URL).
- 파일 첨부 슬롯이 폼 하단에 있어 SPEC-FILE-001의 업로드 엔드포인트와 연동된다.
- 에디터 출력(HTML)이 DB에 저장되고, 문서 상세 뷰에서 안전하게 렌더링된다(DOMPurify 위생처리).
- 코드 블록(highlight.js), 표(table), 링크 삽입/편집이 지원된다.
- 마크다운 단축키(`# 제목`, `**굵게**`, `` ` `` 코드)가 동작한다.

### 1.2 Audience

- expert-frontend agent — 에디터 컴포넌트 구현 (Slice A: 기본 에디터, Slice B: 이미지/파일 연동)
- expert-backend agent — HTML 위생처리 미들웨어, 이미지 업로드 라우터 보강
- 운영자 — 관리자 설정에서 에디터 옵션(허용 태그, 최대 첨부 크기) 구성

### 1.3 Non-Goals

- 커스텀 에디터 플러그인 마켓 — 별도 SPEC
- 동영상 임베드 (YouTube/Vimeo) — P2 후속 확장
- 실시간 협업 편집 — 범위 외

---

## 2. Requirements

### REQ-EDITOR-001: 에디터 컴포넌트

```
WHEN 사용자가 /[mid]/write 또는 /[mid]/[id]/edit 페이지에 접근하면
THE SYSTEM SHALL Tiptap StarterKit + 확장 에디터를 렌더한다
WITH 툴바 버튼: 굵게/기울임/밑줄/취소선/제목(H1~H4)/인용/코드/코드블록/글머리기호/번호목록/수평선/링크/이미지
```

### REQ-EDITOR-002: 이미지 삽입

```
WHEN 사용자가 툴바 이미지 버튼을 클릭하거나 이미지를 드래그앤드롭하면
THE SYSTEM SHALL 이미지 업로드 다이얼로그를 표시한다
AND 업로드 완료 시 반환된 URL을 에디터에 인라인 이미지로 삽입한다
```

### REQ-EDITOR-003: 파일 첨부

```
WHEN 사용자가 파일 첨부 영역에 파일을 드롭하거나 클릭해서 선택하면
THE SYSTEM SHALL SPEC-FILE-001의 /api/upload 엔드포인트에 multipart 업로드를 실행한다
AND 성공 시 첨부 목록 UI에 파일명/크기/삭제 버튼을 추가한다
AND document.files에 연결하여 저장 시 DB에 기록한다
```

### REQ-EDITOR-004: HTML 위생처리

```
WHEN document content(HTML)를 DB에 저장하거나 렌더링할 때
THE SYSTEM SHALL DOMPurify로 위생처리(ALLOW_TAGS 화이트리스트 기반)를 수행한다
AND script/event handler/data URI를 모두 제거한다
```

### REQ-EDITOR-005: 코드 블록 하이라이팅

```
WHEN 사용자가 코드 블록 확장을 사용하면
THE SYSTEM SHALL lowlight(highlight.js) 기반 문법 강조를 적용한다
WITH 최소 지원 언어: javascript, typescript, python, bash, sql, json
```

### REQ-EDITOR-006: 서버사이드 렌더링 호환

```
WHEN Next.js App Router에서 에디터 컴포넌트가 사용될 때
THE SYSTEM SHALL 에디터를 'use client' 컴포넌트로 선언하여 SSR 충돌을 방지한다
AND 문서 상세 뷰(SSR)에서는 HTML 문자열을 직접 렌더링한다
```

---

## 3. Acceptance Criteria

| AC ID | 기준 |
|---|---|
| AC-EDITOR-001 | /board/write 진입 시 Tiptap 에디터가 렌더되고 툴바가 보인다 |
| AC-EDITOR-002 | 굵게/기울임/밑줄 적용 후 저장 → 상세 뷰에서 서식이 유지된다 |
| AC-EDITOR-003 | 이미지 파일을 드래그하면 업로드 후 에디터에 인라인으로 표시된다 |
| AC-EDITOR-004 | `<script>alert(1)</script>` 입력 후 저장 → 상세 뷰에서 실행되지 않는다 |
| AC-EDITOR-005 | 코드 블록에 typescript 코드 입력 시 구문 강조 색상이 표시된다 |
| AC-EDITOR-006 | 파일 첨부 후 저장 → 상세 뷰 하단에 첨부파일 다운로드 링크가 보인다 |
| AC-EDITOR-007 | 모바일 뷰포트(375px)에서 에디터가 usable 상태로 표시된다 |

---

## 4. Technical Approach

### 패키지 선택 근거

- **Tiptap v2**: ProseMirror 기반, Next.js App Router 공식 지원, MIT 라이선스, 확장 생태계 풍부
- **DOMPurify**: XSS 방지 표준 라이브러리, SSR 호환 (isomorphic-dompurify)
- **lowlight**: 서버사이드 하이라이팅 가능, highlight.js 기반

### 구현 파일 범위

```
packages/editor/
├── src/
│   ├── RichEditor.tsx          # Tiptap 에디터 컴포넌트
│   ├── EditorToolbar.tsx       # 툴바 버튼 그룹
│   ├── ImageUploadExtension.ts # 이미지 드래그앤드롭 확장
│   ├── sanitize.ts             # DOMPurify 위생처리 유틸
│   └── index.ts
apps/web/
├── components/board/
│   ├── WriteForm.tsx           # 에디터 + 첨부 통합 폼
│   └── DocumentBody.tsx        # 상세 뷰 HTML 렌더러
```

### Slice 분리

- **Slice A**: 기본 Tiptap 에디터 (텍스트 서식, 코드 블록, 표)
- **Slice B**: 이미지 업로드 + 파일 첨부 연동

---

## 5. Dependencies

- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-*`
- `isomorphic-dompurify`
- `lowlight`, `@tiptap/extension-code-block-lowlight`
- SPEC-FILE-001 — 파일 업로드 엔드포인트

---

## 6. Implementation Notes

> 이 섹션은 sync phase에서 자동 추가됨 (SPEC lifecycle level 1 — spec-first).

### 6.1 구현 완료 현황 (2026-06-28)

**커밋 이력 (feature/SPEC-EDITOR-001)**

| 커밋 | 내용 |
|---|---|
| `f0bdb8c` | Slice A — Tiptap 확장 및 툴바 완성 |
| `bfbab2e` | Slice B — 파일 첨부 UI 및 DOMPurify 위생처리 |
| `ec64e6c` | 테스트 인프라 및 Underline 확장 완성 |

**인수 기준 달성 현황**

| AC ID | 상태 |
|---|---|
| AC-EDITOR-001 | ✅ TiptapEditor 컴포넌트 렌더 + 툴바 |
| AC-EDITOR-002 | ✅ Underline 확장 등록 완료 (서식 유지) |
| AC-EDITOR-003 | ✅ 드래그앤드롭 이미지 업로드 (`handleDrop`) |
| AC-EDITOR-004 | ✅ DOMPurify 위생처리 (`sanitize.ts`) |
| AC-EDITOR-005 | ✅ lowlight + CodeBlockLowlight 문법 강조 |
| AC-EDITOR-006 | ✅ 첨부파일 다운로드 링크 (`view-page.tsx`) |
| AC-EDITOR-007 | ✅ 툴바 flex-wrap으로 375px 대응 |

**테스트 결과**: 143/143 통과 (TypeScript 0 errors)

### 6.2 SPEC 대비 구현 다이버전스

| 항목 | SPEC 계획 | 실제 구현 | 사유 |
|---|---|---|---|
| 구현 패키지 | `packages/editor/src/` | `packages/board/src/components/` | board 패키지에 에디터 도메인 응집 — 별도 패키지 생성 불필요 판단 |
| Tiptap 버전 | v2 | v3.23.6 | 신규 버전 릴리즈, v3 API 상위 호환 유지 |
| 폼 컴포넌트 | `apps/web/components/board/WriteForm.tsx` | `packages/board/src/routes/write-form.tsx` | RSC 라우팅 패턴에 맞게 board 패키지 내 routes로 위치 통일 |
| 뷰 컴포넌트 | `apps/web/components/board/DocumentBody.tsx` | `packages/board/src/routes/view-page.tsx` | 동일 이유 — board 패키지 routes 패턴 |
| 추가 확장 | 미기재 | TextStyle, Color, Highlight | 레거시 Rhymix 에디터 색상/배경색 기능 동등성 확보 |
| 테스트 인프라 | 미기재 | `vitest.config.ts` 신설 | board 패키지에 vitest 설정 부재 — 143개 테스트 실행 위해 추가 |
