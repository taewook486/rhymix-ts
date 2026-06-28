/**
 * write-form.tsx — SPEC-CONTENT-001 REQ-CONTENT-130 / SPEC-EDITOR-001 REQ-EDITOR-003
 *
 * 글쓰기 폼 클라이언트 컴포넌트.
 * TiptapEditor 가 'use client' 를 요구하므로, write-page.tsx(RSC)에서
 * 분리하여 클라이언트 경계로 격리한다.
 * 하단에 파일 첨부 영역(드래그/클릭 업로드 + 목록 + 삭제)을 포함한다.
 *
 * @MX:NOTE [AUTO]: 클라이언트 컴포넌트 경계 — TiptapEditor + FileAttachmentZone 을 포함하는 form 래퍼.
 * @MX:SPEC: SPEC-EDITOR-001 REQ-EDITOR-003
 */
'use client';

import React, { useCallback, useRef, useState } from 'react';
import { TiptapEditor } from '../components/TiptapEditor';

/** 업로드 엔드포인트 — multipart, 필드명 'file', 응답 { id, storageKey } */
const UPLOAD_ENDPOINT = '/api/files/upload';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WriteBoardFormProps {
  action: string;
  moduleInstanceId: string;
  cancelHref: string;
}

// ---------------------------------------------------------------------------
// FileAttachmentZone
// ---------------------------------------------------------------------------

/** 업로드 완료된 첨부파일 1건 */
interface UploadedFile {
  id: number;
  storageKey: string;
  name: string;
  size: number;
}

/** 바이트 크기를 사람이 읽기 쉬운 문자열로 변환 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || Number.isInteger(size) ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * 파일 첨부 영역 — 드래그&드롭 또는 클릭으로 파일을 추가하고,
 * 목록(이름/크기/삭제 버튼)을 표시하며, 업로드된 첨부 id 를 hidden input 으로 제출한다.
 */
function FileAttachmentZone(): React.ReactElement {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (fileList: FileList) => {
    setIsUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: fd });
        if (!res.ok) continue;
        const data = (await res.json()) as { id?: number; storageKey?: string };
        if (typeof data.id !== 'number') continue;
        setFiles((prev) => [
          ...prev,
          {
            id: data.id as number,
            storageKey: data.storageKey ?? '',
            name: file.name,
            size: file.size,
          },
        ]);
      }
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void uploadFiles(e.target.files);
        e.target.value = ''; // 동일 파일 재선택 허용
      }
    },
    [uploadFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        void uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles],
  );

  const handleRemove = useCallback((id: number) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return (
    <div className="file-attachment-zone mt-4" data-file-attachment>
      <label className="block text-sm font-semibold mb-1">첨부파일</label>

      {/* 드롭/클릭 영역 */}
      <div
        role="button"
        tabIndex={0}
        aria-label="파일 첨부 영역"
        className={`flex items-center justify-center border-2 border-dashed rounded p-4 text-sm text-gray-500 cursor-pointer ${
          isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {isUploading
          ? '업로드 중...'
          : '파일을 끌어다 놓거나 클릭하여 첨부하세요'}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        aria-hidden="true"
        onChange={handleSelect}
      />

      {/* 첨부 목록 */}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2 text-sm border rounded px-2 py-1"
            >
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-gray-400">
                {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                aria-label={`${file.name} 삭제`}
                className="text-red-500 hover:text-red-700"
                onClick={() => handleRemove(file.id)}
              >
                ✕
              </button>
              {/* 제출용 hidden input — 업로드된 첨부 id 전달 */}
              <input type="hidden" name="attachmentKeys[]" value={file.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WriteBoardForm
// ---------------------------------------------------------------------------

/**
 * 글쓰기 폼. 제목(text input) + 내용(TiptapEditor) + 첨부파일 + 제출/취소 버튼을 렌더한다.
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

      {/* 파일 첨부 영역 (REQ-EDITOR-003) */}
      <FileAttachmentZone />

      <button type="submit">작성</button>
      <a href={cancelHref}>취소</a>
    </form>
  );
}
