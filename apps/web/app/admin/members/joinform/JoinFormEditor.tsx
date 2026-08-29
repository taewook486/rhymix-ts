'use client';

/**
 * JoinFormEditor.tsx — SPEC-ADMIN-002 REQ-ADMIN2-054/055.
 *
 * 가입 양식 필드 편집 컴포넌트. 필드 추가/삭제/순서 변경 기능 제공.
 * REQ-ADMIN2-055: email, password, nickname 필드는 예약되어 제거/이름 변경 불가.
 *
 * @MX:NOTE: [AUTO] 클라이언트 컴포넌트로 분리된 이유 — form 상태와 submit 핸들러 필요.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-054, REQ-ADMIN2-055
 */
import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateJoinFormAction, type UpdateJoinFormActionField } from './actions';

type JoinFormField = UpdateJoinFormActionField

interface JoinFormEditorProps {
  initial: JoinFormField[];
}

const RESERVED_KEYS: readonly string[] = ['email', 'password', 'nickname'];

export function JoinFormEditor({ initial }: JoinFormEditorProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fields, setFields] = useState<JoinFormField[]>(initial);
  const [error, setError] = useState<string | null>(null);

  function handleAddField(): void {
    const newField: JoinFormField = {
      key: `field_${Date.now()}`,
      label: '새 필드',
      type: 'text',
      required: false,
      order: fields.length,
    };
    setFields([...fields, newField]);
  }

  function handleRemoveField(index: number): void {
    const field = fields[index];
    if (!field) return; // Guard against undefined
    if (RESERVED_KEYS.includes(field.key)) {
      return; // 예약된 필드는 제거 불가
    }
    const newFields = fields.filter((_, i) => i !== index);
    // 순서 재정렬
    setFields(newFields.map((f, i) => ({ ...f, order: i })));
  }

  function handleMoveUp(index: number): void {
    if (index === 0) return;
    const newFields = [...fields];
    const temp = newFields[index - 1];
    if (!temp || !newFields[index]) return; // Guard against undefined
    newFields[index - 1] = newFields[index];
    newFields[index] = temp;
    // 순서 업데이트
    newFields.forEach((f, i) => (f.order = i));
    setFields(newFields);
  }

  function handleMoveDown(index: number): void {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    const temp = newFields[index + 1];
    if (!temp || !newFields[index]) return; // Guard against undefined
    newFields[index + 1] = newFields[index];
    newFields[index] = temp;
    // 순서 업데이트
    newFields.forEach((f, i) => (f.order = i));
    setFields(newFields);
  }

  function handleFieldChange(index: number, updates: Partial<JoinFormField>): void {
    const field = fields[index];
    if (!field) return; // Guard against undefined
    if (RESERVED_KEYS.includes(field.key)) {
      // 예약된 필드는 key와 required만 변경 불가
      if (updates.key !== undefined || updates.required !== undefined) {
        return;
      }
    }
    const newFields = [...fields];
    const currentField = newFields[index];
    if (currentField) {
      newFields[index] = { ...currentField, ...updates };
      setFields(newFields);
    }
  }

  function handleSave(): void {
    setError(null);
    startTransition(async () => {
      const result = await updateJoinFormAction(fields);
      if ('error' in result) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-4xl">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium">순서</th>
              <th className="px-4 py-2 text-left text-sm font-medium">필드 키</th>
              <th className="px-4 py-2 text-left text-sm font-medium">라벨</th>
              <th className="px-4 py-2 text-left text-sm font-medium">타입</th>
              <th className="px-4 py-2 text-left text-sm font-medium">필수</th>
              <th className="px-4 py-2 text-left text-sm font-medium">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {fields.map((field, index) => {
              const isReserved = RESERVED_KEYS.includes(field.key);
              return (
                <tr key={field.key} className={isReserved ? 'bg-zinc-50' : undefined}>
                  <td className="px-4 py-2 text-sm">{field.order + 1}</td>
                  <td className="px-4 py-2">
                    {isReserved ? (
                      <span className="text-sm text-zinc-700 font-medium">{field.key}</span>
                    ) : (
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => handleFieldChange(index, { key: e.target.value })}
                        className="w-full border border-zinc-300 rounded px-2 py-1 text-sm"
                      />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleFieldChange(index, { label: e.target.value })}
                      className="w-full border border-zinc-300 rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    {isReserved ? (
                      <span className="text-sm text-zinc-700">{field.type}</span>
                    ) : (
                      <select
                        value={field.type}
                        onChange={(e) =>
                          handleFieldChange(index, { type: e.target.value as JoinFormField['type'] })
                        }
                        className="w-full border border-zinc-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Textarea</option>
                        <option value="select">Select</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={field.required}
                        disabled={isReserved}
                        onChange={(e) => handleFieldChange(index, { required: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">필수</span>
                    </label>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0 || isPending}
                        className="px-2 py-1 text-xs border border-zinc-300 rounded hover:bg-zinc-50 disabled:opacity-50"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === fields.length - 1 || isPending}
                        className="px-2 py-1 text-xs border border-zinc-300 rounded hover:bg-zinc-50 disabled:opacity-50"
                      >
                        ↓
                      </button>
                      {!isReserved && (
                        <button
                          type="button"
                          onClick={() => handleRemoveField(index)}
                          disabled={isPending}
                          className="px-2 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 disabled:opacity-50"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleAddField}
          disabled={isPending}
          className="px-4 py-2 text-sm bg-zinc-100 border border-zinc-300 rounded hover:bg-zinc-200 disabled:opacity-50"
        >
          필드 추가
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
        <p className="font-medium mb-1">예약된 필드:</p>
        <p>email, password, nickname 필드는 제거하거나 이름을 변경할 수 없습니다.</p>
      </div>
    </div>
  );
}
