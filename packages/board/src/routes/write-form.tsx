/**
 * write-form.tsx — SPEC-CONTENT-001 REQ-CONTENT-130
 *
 * 글쓰기 폼 클라이언트 컴포넌트.
 * TiptapEditor 가 'use client' 를 요구하므로, write-page.tsx(RSC)에서
 * 분리하여 클라이언트 경계로 격리한다.
 *
 * @MX:NOTE [AUTO]: 클라이언트 컴포넌트 경계 — TiptapEditor 를 포함하는 유일한 form 래퍼.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-130
 */
'use client';

import React from 'react';
import { TiptapEditor } from '../components/TiptapEditor.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WriteBoardFormProps {
  action: string;
  moduleInstanceId: string;
  cancelHref: string;
}

// ---------------------------------------------------------------------------
// WriteBoardForm
// ---------------------------------------------------------------------------

/**
 * 글쓰기 폼. 제목(text input) + 내용(TiptapEditor) + 제출/취소 버튼을 렌더한다.
 * form method="POST" 로 제출 — Server Action URL 은 props 로 주입받는다.
 */
export function WriteBoardForm({
  action,
  moduleInstanceId,
  cancelHref,
}: WriteBoardFormProps): React.ReactElement {
  return (
    <form method="POST" action={action}>
      <input type="hidden" name="moduleInstanceId" value={moduleInstanceId} />
      <div>
        <label htmlFor="title">제목</label>
        <input id="title" name="title" type="text" required maxLength={200} />
      </div>
      <div>
        <label htmlFor="content">내용</label>
        <TiptapEditor name="content" placeholder="내용을 입력하세요..." required />
      </div>
      <button type="submit">작성</button>
      <a href={cancelHref}>취소</a>
    </form>
  );
}
