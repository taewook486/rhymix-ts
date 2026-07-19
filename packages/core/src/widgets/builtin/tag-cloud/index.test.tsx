// @vitest-environment jsdom
/**
 * tag-cloud 빌트인 위젯 테스트 — SPEC-TAG-001 REQ-TAG-005
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { resetWidgetRegistry } from '../../registry';
import { validateWidgetProps } from '../../validate';
import { registerBuiltinWidgets, resetBuiltinWidgetsInit } from '../index';
import { tagCloudWidget } from './index';
import type { WidgetRenderContext } from '../../types';

// 컴포넌트 편의 렌더 헬퍼
function renderTagCloud(props: Record<string, unknown>) {
  const Component = tagCloudWidget.Component as React.ComponentType<Record<string, unknown>>;
  return render(React.createElement(Component, props));
}

describe('tag-cloud 위젯 — REQ-TAG-005', () => {
  beforeEach(() => {
    resetWidgetRegistry();
    resetBuiltinWidgetsInit();
  });

  it('C-TAGCLOUD-1: tags 배열 제공 → 태그 링크 렌더링', () => {
    const { container } = renderTagCloud({
      limit: 30,
      minFontSize: 12,
      maxFontSize: 24,
      sortBy: 'count',
      tags: [
        { id: 1, name: '공지', count: 10 },
        { id: 2, name: '잡담', count: 3 },
      ],
    });
    const links = container.querySelectorAll('[data-testid^="tag-cloud-link-"]');
    expect(links).toHaveLength(2);
  });

  it('C-TAGCLOUD-2: tags=[] → 빈 상태 문구 렌더링', () => {
    const { container } = renderTagCloud({ tags: [] });
    expect(container.textContent).toContain('태그가 없습니다.');
  });

  it('C-TAGCLOUD-3: tags 미제공 → 빈 상태 문구 렌더링 (기본값 처리)', () => {
    const { container } = renderTagCloud({});
    expect(container.textContent).toContain('태그가 없습니다.');
  });

  it('C-TAGCLOUD-4: 태그 링크가 /tag/{tagName} 을 가리킨다', () => {
    const { container } = renderTagCloud({
      tags: [{ id: 1, name: '공지', count: 10 }],
    });
    const link = container.querySelector('[data-testid="tag-cloud-link-1"]');
    expect(link?.getAttribute('href')).toBe('/tag/%EA%B3%B5%EC%A7%80');
  });

  it('C-TAGCLOUD-5: limit 초과 시 표시 개수 안내 문구 렌더링', () => {
    const { container } = renderTagCloud({
      limit: 1,
      tags: [
        { id: 1, name: 'a', count: 5 },
        { id: 2, name: 'b', count: 3 },
      ],
    });
    expect(container.textContent).toContain('전체 2개 중 1개 표시');
  });

  it('C-TAGCLOUD-6: 위젯 name이 "tag-cloud"', () => {
    expect(tagCloudWidget.name).toBe('tag-cloud');
  });

  it('C-TAGCLOUD-7: registerBuiltinWidgets — idempotent (두 번 호출해도 정상)', () => {
    expect(() => {
      registerBuiltinWidgets();
      registerBuiltinWidgets();
    }).not.toThrow();
  });

  it('C-TAGCLOUD-8: defaultProps로 기본값 검증 성공', () => {
    const result = validateWidgetProps(tagCloudWidget, {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.props.limit).toBe(30);
      expect(result.props.sortBy).toBe('count');
    }
  });

  it('C-TAGCLOUD-9: resolveContextProps — ctx.prisma.tag.findMany 결과를 tags 로 주입', async () => {
    const mockTags = [{ id: 1, name: '공지', count: 10 }];
    const findMany = vi.fn().mockResolvedValue(mockTags);
    const ctx = {
      isAdmin: false,
      user: null,
      prisma: { tag: { findMany } } as unknown as WidgetRenderContext['prisma'],
    } satisfies WidgetRenderContext;

    const result = await tagCloudWidget.resolveContextProps?.(ctx);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { count: 'desc' }, take: 100 }),
    );
    expect(result?.tags).toEqual(mockTags);
  });
});
