/**
 * service.ts — SPEC-PAGE-001 Slice A
 *
 * 페이지 모듈 핵심 서비스 함수.
 * prisma 는 파라미터로 주입받아 apps/web 레이어의 의존성을 피한다 (REQ-PAGE-009).
 *
 * @MX:WARN [AUTO]: sanitizePageBody 는 DOMPurify 설정을 직접 수정하므로 설정 변경 시 주의.
 * @MX:REASON: ALLOWED_TAGS / ALLOWED_ATTR 변경이 XSS 취약점을 유발할 수 있음.
 */
import type { PrismaClient } from '@prisma/client'
import type DOMPurifyType from 'isomorphic-dompurify'
import type { PageContent, PageType } from './types'

// isomorphic-dompurify는 jsdom을 로드하므로 lazy import — 빌드 시점에 불러오지 않음
let _DOMPurify: typeof DOMPurifyType | undefined
async function getDOMPurify(): Promise<typeof DOMPurifyType> {
  if (!_DOMPurify) {
    const m = await import('isomorphic-dompurify')
    _DOMPurify = m.default as typeof DOMPurifyType
  }
  return _DOMPurify
}
import { pageConfigSchema } from './config'

/**
 * 페이지 모듈 인스턴스의 본문을 로드한다.
 *
 * @MX:ANCHOR [AUTO]: routes.index, admin edit page, savePageContent 에서 참조.
 * @MX:REASON: 인스턴스 유효성(moduleCode === 'page') 검사 + mcontent 로드의 단일 경로.
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-003
 */
export async function loadPageContent(
  instanceId: number,
  prisma: PrismaClient,
): Promise<PageContent | null> {
  try {
    // 인스턴스 + 설정을 함께 조회
    const instance = await prisma.moduleInstance.findUnique({
      where: { id: instanceId },
      include: { config: true },
    })

    // 인스턴스가 없거나 'page' 모듈이 아니면 null 반환
    if (!instance || instance.moduleCode !== 'page') {
      return null
    }

    // 설정 파싱 (실패 시 기본값)
    let pageType: PageType = 'CONTENT'
    if (instance.config) {
      try {
        const parsed = pageConfigSchema.safeParse(instance.config.config)
        if (parsed.success) {
          pageType = parsed.data.pageType
        }
      } catch {
        // 파싱 오류는 무시하고 기본값 사용
      }
    }

    return {
      instanceId: instance.id,
      mcontent: instance.mcontent ?? null,
      pageType,
      mcontentFormat: 'HTML',
    }
  } catch {
    // DB 오류는 null 로 안전하게 처리 (REQ-PAGE-003: never throw)
    return null
  }
}

/**
 * 페이지 본문을 저장한다 (upsert).
 * mcontent 와 config.pageType 을 트랜잭션 안에서 함께 업데이트.
 *
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-004
 */
export async function savePageContent(
  input: { instanceId: number; mcontent: string; pageType: PageType },
  prisma: PrismaClient,
): Promise<PageContent> {
  const { instanceId, mcontent, pageType } = input

  await prisma.$transaction(async (tx) => {
    // mcontent 업데이트
    await tx.moduleInstance.update({
      where: { id: instanceId },
      data: { mcontent },
    })

    // config upsert (pageType 저장)
    await tx.moduleConfig.upsert({
      where: { moduleInstanceId: instanceId },
      create: {
        moduleInstanceId: instanceId,
        config: { pageType, mcontentFormat: 'HTML' },
      },
      update: {
        config: { pageType, mcontentFormat: 'HTML' },
      },
    })
  })

  return {
    instanceId,
    mcontent,
    pageType,
    mcontentFormat: 'HTML',
  }
}

// rx-widget 토큰 정규식 (자기 닫힘 + 쌍 태그 모두 지원)
const RX_WIDGET_RE = /<rx-widget\s[^>]*?\/>|<rx-widget\s[^>]*?><\/rx-widget>/g

/**
 * HTML 본문을 XSS 필터링한다.
 *
 * 전략: rx-widget 토큰을 DOMPurify 처리 전에 플레이스홀더로 교체하고,
 * 살균 후 원본 토큰을 복원한다. DOMPurify 설정 복잡성 없이 토큰을 100% 보존한다.
 *
 * 허용 태그: 표준 마크업 (제목/텍스트/리스트/미디어/테이블).
 * 금지: script, style, on* 이벤트 핸들러.
 *
 * @MX:ANCHOR [AUTO]: PageBody 컴포넌트, module.ts routes.index, savePageAction 에서 참조.
 * @MX:REASON: XSS 방어의 단일 게이트웨이. 호출 경로가 3개 이상.
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-007, REQ-PAGE-008
 */
export async function sanitizePageBody(raw: string): Promise<string> {
  const DOMPurify = await getDOMPurify()
  // 1단계: rx-widget 토큰 추출 후 플레이스홀더로 교체
  const tokens: string[] = []
  const withPlaceholders = raw.replace(RX_WIDGET_RE, (match) => {
    const idx = tokens.length
    tokens.push(match)
    // DOMPurify가 제거하지 않을 inert 플레이스홀더 사용
    return `<span data-rxw-placeholder="${idx}"></span>`
  })

  // 2단계: 나머지 HTML 살균
  const sanitized = DOMPurify.sanitize(withPlaceholders, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'div', 'span', 'blockquote', 'pre', 'code',
      'a', 'strong', 'em', 'b', 'i', 's', 'u', 'sub', 'sup',
      'ul', 'ol', 'li',
      'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'br', 'hr',
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'style',
      'href', 'target', 'rel',
      'src', 'alt', 'width', 'height',
      'colspan', 'rowspan',
      // 플레이스홀더 복원용
      'data-rxw-placeholder',
    ],
  })

  // 3단계: 플레이스홀더를 원본 rx-widget 토큰으로 복원
  return sanitized.replace(
    /<span data-rxw-placeholder="(\d+)"><\/span>/g,
    (_, idx: string) => tokens[parseInt(idx, 10)] ?? '',
  )
}
