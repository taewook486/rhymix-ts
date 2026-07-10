/**
 * 메뉴 트리 렌더러 — SPEC-MENU-001 Slice D.
 *
 * 재귀적으로 MenuItem 트리를 렌더링하는 공통 컴포넌트.
 * GlobalHeader, Footer, Utility 컴포넌트에서 사용.
 * @MX:ANCHOR: [AUTO] menu tree rendering with ACL + attributes
 * @MX:REASON: Shared by header/footer/utility slots; high fan_in (3+ callers)
 * @MX:SPEC: SPEC-MENU-001 REQ-MENU-030~034
 */
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/config';

interface MenuItemTreeNode {
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
  children: MenuItemTreeNode[];
}

/**
 * 메뉴 트리를 재귀적으로 조회하여 빌드.
 */
async function buildMenuTree(
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
      children,
    });
  }

  return result;
}

/**
 * 메뉴 트리를 재귀적으로 렌더링.
 */
function MenuTree({ items, level = 0 }: { items: MenuItemTreeNode[]; level?: number }) {
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
 * 개별 메뉴 항목 렌더링 (REQ-MENU-033: icon, cssClass, openInNewWindow).
 */
function MenuItemLink({ item }: { item: MenuItemTreeNode }) {
  const className = [
    'text-sm text-gray-700 hover:text-blue-600 font-medium transition-colors',
    item.cssClass || '',
  ]
    .join(' ')
    .trim();

  const icon = item.icon ? <span className="mr-1">{item.icon}</span> : null;

  const linkProps = item.openInNewWindow
    ? { target: '_blank', rel: 'noopener' as const }
    : {};

  if (!item.url) {
    return (
      <span className={className}>
        {icon}
        {item.title}
      </span>
    );
  }

  return (
    <Link href={item.url} className={className} {...linkProps}>
      {icon}
      {item.title}
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
