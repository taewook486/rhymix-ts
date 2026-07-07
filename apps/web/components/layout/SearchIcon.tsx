'use client';

/**
 * SearchIcon — SPEC-SEARCH-001 헤더 검색 UI
 *
 * Client Component for search icon interaction.
 */
import { useState, FormEvent, useRef } from 'react';

export function SearchIcon() {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  const handleIconClick = () => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="relative">
      {!expanded ? (
        <button
          onClick={handleIconClick}
          className="rounded p-2 text-gray-600 hover:bg-gray-100"
          aria-label="검색"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요"
            className="w-48 rounded border px-3 py-1 text-sm"
          />
          <button
            type="submit"
            className="ml-2 rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
          >
            검색
          </button>
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setQuery('');
            }}
            className="ml-1 text-sm text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </form>
      )}
    </div>
  );
}
