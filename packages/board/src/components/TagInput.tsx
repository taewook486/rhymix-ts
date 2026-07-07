/**
 * TagInput — SPEC-TAG-001 (REQ-TAG-001)
 *
 * 태그 입력 컴포넌트 (칩 형태 + 자동완성)
 * 최대 10개, 각 태그 최대 30자, 쉼표 또는 Enter로 추가
 *
 * @MX:SPEC: SPEC-TAG-001 REQ-TAG-001
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';

// @MX:NOTE: [AUTO] 태그 데이터 구조 — 칩 렌더링 및 중복 검사용
interface TagChip {
  id: string;
  name: string;
}

interface TagInputProps {
  /** 기존 태그 배열 (초기값) */
  defaultValue?: string[];
  /** 태그 변경 시 콜백 */
  onChange?: (tags: string[]) => void;
  /** 최대 태그 개수 (기본 10) */
  maxTags?: number;
  /** 태그 최대 길이 (기본 30) */
  maxTagLength?: number;
  /** 자동완성 제안 목록 (tRPC에서 가져옴) */
  suggestions?: Array<{ name: string; count: number }>;
  /** name 속성 (폼 제출용) */
  name?: string;
}

/**
 * REQ-TAG-001: 태그 입력 UI 컴포넌트
 * - 쉼표 또는 Enter로 태그 추가
 * - X 버튼으로 개별 태그 제거
 * - 최대 10개, 각 태그 최대 30자
 * - 자동완성 드롭다운 제공
 */
export function TagInput({
  defaultValue = [],
  onChange,
  maxTags = 10,
  maxTagLength = 30,
  suggestions = [],
  name = 'tags',
}: TagInputProps) {
  const [tags, setTags] = useState<TagChip[]>(() =>
    defaultValue.map((name, idx) => ({ id: `tag-${idx}`, name }))
  );
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  // @MX:ANCHOR: [AUTO] handleTagsChange — 태그 상태를 부모 컴포넌트와 동기화
  // @MX:REASON: 폼 제출 및 상태 관리를 위한 단일 진실 원천
  function handleTagsChange(newTags: TagChip[]) {
    setTags(newTags);
    onChange?.(newTags.map((t) => t.name));
  }

  // 태그 추가
  function addTag(tagName: string) {
    const trimmed = tagName.trim();

    // 중복 검사
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    // 최대 개수 및 길이 검사
    if (tags.length >= maxTags) {
      alert(`최대 ${maxTags}개의 태그를 추가할 수 있습니다.`);
      return;
    }

    if (trimmed.length > maxTagLength) {
      alert(`태그는 최대 ${maxTagLength}자까지 가능합니다.`);
      return;
    }

    if (trimmed.length === 0) {
      return;
    }

    const newTag: TagChip = { id: `tag-${Date.now()}`, name: trimmed };
    handleTagsChange([...tags, newTag]);
    setInputValue('');
    setShowSuggestions(false);
  }

  // 태그 제거
  function removeTag(tagId: string) {
    const newTags = tags.filter((t) => t.id !== tagId);
    handleTagsChange(newTags);
  }

  // 입력 변경 핸들러
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setInputValue(value);

    // 자동완성 필터링
    if (value.length > 0) {
      const filtered = suggestions.filter((s) =>
        s.name.toLowerCase().includes(value.toLowerCase())
      );
      setShowSuggestions(filtered.length > 0);
      setHighlightedIndex(-1);
    } else {
      setShowSuggestions(false);
    }
  }

  // 키다운 핸들러 (Enter, 쉼표, 방향키, Esc)
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Enter 또는 쉼표로 태그 추가
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue.trim());
      }
      return;
    }

    // Esc로 드롭다운 닫기
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      return;
    }

    // 방향키로 자동완성 탐색
    if (showSuggestions) {
      const filtered = suggestions.filter((s) =>
        s.name.toLowerCase().includes(inputValue.toLowerCase())
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      }
    }
  }

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 자동완성 제안 클릭 핸들러
  function handleSuggestionClick(suggestion: string) {
    addTag(suggestion);
  }

  // 필터링된 자동완성 목록
  const filteredSuggestions = showSuggestions
    ? suggestions.filter((s) =>
        s.name.toLowerCase().includes(inputValue.toLowerCase())
      )
    : [];

  // 폼 제출을 위한 숨겨진 input 값
  const tagsValue = tags.map((t) => t.name).join(',');

  return (
    <div className="tag-input">
      {/* 태그 칩 목록 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2" data-testid="tag-chips">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded text-sm"
              data-testid={`tag-chip-${tag.id}`}
            >
              <span>{tag.name}</span>
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                aria-label={`태그 ${tag.name} 삭제`}
              >
                ×
              </button>
            </span>
          ))}
          <span className="text-gray-500 text-sm">
            ({tags.length}/{maxTags})
          </span>
        </div>
      )}

      {/* 입력 필드 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="태그 입력 (쉼표 또는 Enter로 추가)"
          className="w-full border rounded px-3 py-2"
          disabled={tags.length >= maxTags}
          maxLength={maxTagLength}
          data-testid="tag-input"
        />

        {/* 자동완성 드롭다운 */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded shadow-lg max-h-60 overflow-auto"
            data-testid="tag-suggestions"
          >
            {filteredSuggestions.map((suggestion, idx) => (
              <li
                key={suggestion.name}
                onClick={() => handleSuggestionClick(suggestion.name)}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  idx === highlightedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
                data-testid={`tag-suggestion-${suggestion.name}`}
              >
                <span className="font-medium">{suggestion.name}</span>
                <span className="text-gray-500 text-sm ml-2">
                  ({suggestion.count}개 게시물)
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 폼 제출용 숨겨진 input */}
      <input
        type="hidden"
        name={name}
        value={tagsValue}
        data-testid="tags-hidden"
      />
    </div>
  );
}
