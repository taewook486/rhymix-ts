/**
 * TagInput.test.tsx — SPEC-TAG-001 (REQ-TAG-001)
 *
 * 태그 입력 컴포넌트 테스트
 *
 * @MX:SPEC: SPEC-TAG-001 REQ-TAG-001
 */
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TagInput } from './TagInput';

// @MX:NOTE [AUTO] vitest globals:false 환경에서는 RTL auto-cleanup 가 비활성화되므로
//                   매 테스트 후 수동 cleanup() 호출 필요 (CommentItem.test.tsx 패턴과 동일).
afterEach(() => {
  cleanup();
});

describe('TagInput — SPEC-TAG-001 REQ-TAG-001', () => {
  it('AC-TAG-001: 태그 입력 후 저장 시 상태 뷰에 태그 칩이 표시된다', async () => {
    const onChange = vi.fn();
    render(<TagInput onChange={onChange} />);

    const input = screen.getByTestId('tag-input');
    const tagsHidden = screen.getByTestId('tags-hidden');

    // 태그 입력
    fireEvent.change(input, { target: { value: 'react' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // 태그 칩 표시 확인
    expect(screen.getByTestId('tag-chips')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(['react']);

    // 폼 제출용 값 확인
    expect(tagsHidden).toHaveAttribute('value', 'react');
  });

  it('AC-TAG-002: 태그 입력 시 기존 태그 자동완성이 표시된다', async () => {
    const suggestions = [
      { name: 'react', count: 100 },
      { name: 'vue', count: 50 },
      { name: 'angular', count: 30 },
    ];

    render(<TagInput suggestions={suggestions} />);

    const input = screen.getByTestId('tag-input');

    // 're' 입력
    fireEvent.change(input, { target: { value: 're' } });

    // 자동완성 드롭다운 표시 확인
    await waitFor(() => {
      expect(screen.getByTestId('tag-suggestions')).toBeInTheDocument();
      expect(screen.getByTestId('tag-suggestion-react')).toBeInTheDocument();
    });
  });

  it('쉼표로 태그를 추가할 수 있다', async () => {
    const onChange = vi.fn();
    render(<TagInput onChange={onChange} />);

    const input = screen.getByTestId('tag-input');

    fireEvent.change(input, { target: { value: 'typescript' } });
    fireEvent.keyDown(input, { key: ',' });

    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(['typescript']);
  });

  it('X 버튼으로 태그를 제거할 수 있다', async () => {
    const onChange = vi.fn();
    render(<TagInput defaultValue={['react', 'vue']} onChange={onChange} />);

    const reactChip = screen.getByTestId('tag-chips').querySelector('[data-testid^="tag-chip-"]');
    const removeButton = reactChip?.querySelector('button');

    // 첫 번째 태그 제거
    fireEvent.click(removeButton!);

    expect(screen.queryByText('react')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(['vue']);
  });

  it('최대 10개의 태그를 추가할 수 있다', async () => {
    const onChange = vi.fn();
    render(<TagInput onChange={onChange} maxTags={10} />);

    const input = screen.getByTestId('tag-input');

    // 10개 태그 추가
    for (let i = 1; i <= 10; i++) {
      fireEvent.change(input, { target: { value: `tag${i}` } });
      fireEvent.keyDown(input, { key: 'Enter' });
    }

    expect(onChange).toHaveBeenLastCalledWith(
      expect.arrayContaining(['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10'])
    );

    // 11번째 태그는 추가되지 않아야 함
    fireEvent.change(input, { target: { value: 'tag11' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // alert가 호출되어야 함 (최대 개수 초과)
    expect(onChange).toHaveBeenCalledTimes(10); // 10개까지만 호출됨
  });

  it('각 태그는 최대 30자까지 가능하다', async () => {
    const onChange = vi.fn();
    render(<TagInput onChange={onChange} maxTagLength={30} />);

    const input = screen.getByTestId('tag-input') as HTMLInputElement;

    // 30자 태그 추가
    const longTag = 'a'.repeat(30);
    fireEvent.change(input, { target: { value: longTag } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText(longTag)).toBeInTheDocument();

    // 31자 태그는 추가되지 않아야 함
    const tooLongTag = 'b'.repeat(31);
    fireEvent.change(input, { target: { value: tooLongTag } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.queryByText(tooLongTag)).not.toBeInTheDocument();
  });

  it('중복 태그는 추가되지 않는다', async () => {
    const onChange = vi.fn();
    render(<TagInput defaultValue={['react']} onChange={onChange} />);

    const input = screen.getByTestId('tag-input');

    // 중복 태그 입력
    fireEvent.change(input, { target: { value: 'react' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // onChange는 한 번만 호출되어야 함 (중복 태그 추가되지 않음)
    expect(onChange).toHaveBeenCalledTimes(0); // 중복이므로 추가되지 않음
  });

  it('방향키로 자동완성을 탐색할 수 있다', async () => {
    const suggestions = [
      { name: 'react', count: 100 },
      { name: 'redux', count: 50 },
    ];

    render(<TagInput suggestions={suggestions} />);

    const input = screen.getByTestId('tag-input');

    fireEvent.change(input, { target: { value: 're' } });

    await waitFor(() => {
      expect(screen.getByTestId('tag-suggestions')).toBeInTheDocument();
    });

    // 아래쪽 방향키 — 한 번 누르면 첫 번째 항목(-1 → 0) 하이라이트
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // 첫 번째 항목이 하이라이트되어야 함
    const firstItem = screen.getByTestId('tag-suggestion-react');
    expect(firstItem).toHaveClass('bg-gray-100');
  });

  it('Esc로 자동완성을 닫을 수 있다', async () => {
    const suggestions = [{ name: 'react', count: 100 }];

    render(<TagInput suggestions={suggestions} />);

    const input = screen.getByTestId('tag-input');

    fireEvent.change(input, { target: { value: 're' } });

    await waitFor(() => {
      expect(screen.getByTestId('tag-suggestions')).toBeInTheDocument();
    });

    // Esc로 닫기
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByTestId('tag-suggestions')).not.toBeInTheDocument();
  });
});
