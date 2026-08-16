/**
 * 메뉴 트리 렌더러 — SPEC-MENU-001 Slice D.
 *
 * 재귀적으로 MenuItem 트리를 렌더링하는 공통 컴포넌트.
 * GlobalHeader, Footer, Utility 컴포넌트에서 사용.
 * 상태별 버튼 이미지 렌더링 — SPEC-LEGACY-PARITY-001 M3 (AC-SITE-010).
 * @MX:ANCHOR: [AUTO] menu tree rendering with ACL + attributes
 * @MX:REASON: Shared by header/footer/utility slots; high fan_in (3+ callers)
 * @MX:SPEC: SPEC-MENU-001 REQ-MENU-030~034, SPEC-LEGACY-PARITY-001 REQ-SITE-010
 */
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/config';
import {
  asButtonImageRef,
  resolveButtonImageUrl,
} from '@/lib/menu/button-image';

/** 상태별 버튼 이미지 1종 (URL 해석 완료 + alt 폴백 적용) */
export interface MenuButtonImage {
  url: string;
  alt: string;
}

/** 노드의 버튼 이미지 3종 — 이미지가 하나도 없으면 null (텍스트 라벨 분기) */
export interface MenuButtonImages {
  normal: MenuButtonImage | null;
  hover: MenuButtonImage | null;
  active: MenuButtonImage | null;
}

export interface MenuItemTreeNode {
  id: number;
  title: string;
  url: string | null;
  icon: string | null;
  cssClass: string | null;
  description: string | null;
  groupIds: number[];
  openInNewWindow: boolean;
  expand: boolean;
  listOrder: number;
  buttonImages: MenuButtonImages | null;
  children: MenuItemTreeNode[];
}

/**
 * 버튼 필드 3종을 URL 해석한 MenuButtonImages 로 만든다 (M3 — AC-SITE-010).
 * alt는 참조의 alt, 없으면 항목 제목으로 폴백한다 (라벨 없는 이미지 방지).
 * 이미지가 하나도 없으면 null — 공개 렌더는 텍스트 라벨 분기로 폴백한다.
 */
async function resolveButtonImages(
  item: { title: string; normalBtn: unknown; hoverBtn: unknown; activeBtn: unknown },
): Promise<MenuButtonImages | null> {
  const normalRef = asButtonImageRef(item.normalBtn);
  const hoverRef = asButtonImageRef(item.hoverBtn);
  const activeRef = asButtonImageRef(item.activeBtn);

  if (!normalRef && !hoverRef && !activeRef) return null;

  const resolve = async (
    ref: ReturnType<typeof asButtonImageRef>,
  ): Promise<MenuButtonImage | null> =>
    ref
      ? {
          url: (await resolveButtonImageUrl(ref)) ?? '',
          alt: ref.alt ?? item.title,
        }
      : null;

  const [normal, hover, active] = await Promise.all([
    resolve(normalRef),
    resolve(hoverRef),
    resolve(activeRef),
  ]);

  return { normal, hover, active };
}

/**
 * 메뉴 트리를 재귀적으로 조회하여 빌드.
 */
export async function buildMenuTree(
  menuId: number,
  parentId: number | null = null,
  userGroupIds: number[] = [],
): Promise<MenuItemTreeNode[]> {
  const items = await prisma.menuItem.findMany({
    where: {
      menuId,
      parentId,
    },
    orderBy: { listOrder: 'asc' },
  });

  const result: MenuItemTreeNode[] = [];

  for (const item of items) {
    // REQ-MENU-032: groupIds ACL — item hidden unless viewer belongs to at least one listed group
    if (item.groupIds.length > 0 && !item.groupIds.some((gid) => userGroupIds.includes(gid))) {
      continue;
    }

    const children = await buildMenuTree(menuId, item.id, userGroupIds);
    const buttonImages = await resolveButtonImages(item);

    result.push({
      id: item.id,
      title: item.title,
      url: item.url,
      icon: item.icon,
      cssClass: item.cssClass,
      description: item.description,
      groupIds: item.groupIds,
      openInNewWindow: item.openInNewWindow,
      expand: item.expand,
      listOrder: item.listOrder,
      buttonImages,
      children,
    });
  }

  return result;
}

/**
 * 메뉴 트리를 재귀적으로 렌더링.
 */
export function MenuTree({ items, level = 0 }: { items: MenuItemTreeNode[]; level?: number }) {
  if (items.length === 0) return null;

  const Tag = level === 0 ? 'ul' : 'ul';

  return (
    <Tag className={level === 0 ? 'flex gap-4' : 'space-y-1'}>
      {items.map((item) => (
        <li key={item.id}>
          <MenuItemLink item={item} />
          {item.children.length > 0 && (
            <MenuTree items={item.children} level={level + 1} />
          )}
        </li>
      ))}
    </Tag>
  );
}

/**
 * 상태별 버튼 이미지 레이어 (M3 — AC-SITE-010).
 * normal 은 기본 표시(라벨 대체)하며 크기를 결정하고, hover/active 는 CSS
 * 상태 선택자로 전환되는 겹침 레이어다 (design.md D3 — JS 없이
 * group-hover/group-active 사용). normal 이 없으면 이 블록 자체가 성립하지
 * 않으므로 렌더하지 않는다(호버·활성만 있는 조합은 미지원).
 *
 * 전환은 "겹치기"가 아니라 "교대"다: 상태 레이어가 켜질 때 normal 이 함께
 * 꺼져야 두 이미지가 동시에 보이지 않는다. hover 와 active 가 동시에 참인
 * 구간(누르고 있는 동안)은 뒤에 온 active 가 DOM 순서상 위에 그려져 이긴다 —
 * Tailwind 변형 정렬 순서에 기대지 않기 위한 선택이다.
 */
function MenuButtonImageLayers({ images }: { images: MenuButtonImages }) {
  if (!images.normal) return null;

  // normal 은 대체 레이어가 실제로 있는 상태에서만 숨긴다 — hover 이미지가 없는
  // 항목까지 group-hover:opacity-0 을 걸면 마우스를 올렸을 때 버튼이 통째로
  // 사라진다(빈 링크). 겹침 레이어는 절대 배치라 normal 이 투명해져도 레이아웃
  // 높이는 그대로 유지된다.
  const normalClassName = [
    'block h-[1.6em] w-auto select-none transition-opacity duration-100',
    images.hover ? 'group-hover:opacity-0' : '',
    images.active ? 'group-active:opacity-0' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className="relative inline-flex items-center">
      <img
        data-menu-btn="normal"
        src={images.normal.url}
        alt={images.normal.alt}
        className={normalClassName}
      />
      {images.hover && (
        <img
          data-menu-btn="hover"
          src={images.hover.url}
          alt={images.hover.alt}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-100 group-hover:opacity-100"
        />
      )}
      {images.active && (
        <img
          data-menu-btn="active"
          src={images.active.url}
          alt={images.active.alt}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-100 group-active:opacity-100"
        />
      )}
    </span>
  );
}

/**
 * 개별 메뉴 항목 렌더링 (REQ-MENU-033: icon, cssClass, openInNewWindow).
 * normal 버튼 이미지가 있으면 라벨 텍스트를 대체한다 (M3 — AC-SITE-010,
 * 라벨 없는 빈 링크 금지: 이미지가 없으면 항상 텍스트 라벨을 렌더한다).
 */
function MenuItemLink({ item }: { item: MenuItemTreeNode }) {
  const useImages = Boolean(item.buttonImages?.normal);
  const className = [
    'text-sm text-gray-700 hover:text-blue-600 font-medium transition-colors',
    useImages ? 'group inline-flex items-center' : '',
    item.cssClass || '',
  ]
    .join(' ')
    .trim();

  const icon = item.icon ? <span className="mr-1">{item.icon}</span> : null;

  const linkProps = item.openInNewWindow
    ? { target: '_blank', rel: 'noopener' as const }
    : {};

  const content = useImages ? (
    <MenuButtonImageLayers images={item.buttonImages!} />
  ) : (
    <>
      {icon}
      {item.title}
    </>
  );

  if (!item.url) {
    return <span className={className}>{content}</span>;
  }

  return (
    <Link href={item.url} className={className} {...linkProps}>
      {content}
    </Link>
  );
}

/**
 * 메뉴 슬롯 렌더러 (REQ-MENU-030~034).
 *
 * @param slot - HEADER_PRIMARY | FOOTER | UTILITY
 * @param domainId - 도메인 ID
 * @returns Menu 트리 렌더링 결과
 */
export async function MenuSlotRenderer({
  slot,
  domainId,
}: {
  slot: 'HEADER_PRIMARY' | 'FOOTER' | 'UTILITY';
  domainId: number;
}) {
  // Get session for groupIds ACL
  const session = await auth();
  const userId = session?.user?.id
    ? typeof session.user.id === 'string'
      ? Number.parseInt(session.user.id, 10)
      : session.user.id
    : null;

  // Fetch user's group IDs
  let userGroupIds: number[] = [];
  if (userId) {
    const memberships = await prisma.memberGroupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    userGroupIds = memberships.map((m) => m.groupId);
  }

  // Find slot assignment
  const assignment = await prisma.menuSlotAssignment.findUnique({
    where: {
      domainId_slot: {
        domainId,
        slot,
      },
    },
    include: {
      menu: true,
    },
  });

  if (!assignment || !assignment.menu) {
    return null;
  }

  // Build menu tree with ACL
  const tree = await buildMenuTree(assignment.menuId, null, userGroupIds);

  if (tree.length === 0) {
    return null;
  }

  return <MenuTree items={tree} />;
}
