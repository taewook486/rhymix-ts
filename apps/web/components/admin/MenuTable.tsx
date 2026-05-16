'use client'
/**
 * Menu 목록 테이블 — SPEC-ADMIN-001 Slice D.
 *
 * Slice C 의 ModuleTable 패턴과 동일.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030
 */
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@rhymix-ts/ui/components'
import { DeleteMenuButton } from './DeleteMenuButton'

interface Menu {
  id: number
  title: string
  isAdminMenu: boolean
  listOrder: number
  createdAt: Date
}

interface MenuTableProps {
  menus: Menu[]
}

export function MenuTable({ menus }: MenuTableProps) {
  if (menus.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 p-8 text-center text-sm text-zinc-500">
        등록된 메뉴가 없습니다
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>이름</TableHead>
          <TableHead>종류</TableHead>
          <TableHead>순서</TableHead>
          <TableHead>등록일</TableHead>
          <TableHead className="text-right">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {menus.map((menu) => (
          <TableRow key={menu.id}>
            <TableCell className="font-medium">
              <Link href={`/admin/menu/${menu.id}`} className="hover:underline text-blue-600">
                {menu.title}
              </Link>
            </TableCell>
            <TableCell>{menu.isAdminMenu ? '관리자 메뉴' : '일반 메뉴'}</TableCell>
            <TableCell>{menu.listOrder}</TableCell>
            <TableCell>{new Date(menu.createdAt).toLocaleDateString('ko-KR')}</TableCell>
            <TableCell className="text-right">
              <DeleteMenuButton menuId={menu.id} title={menu.title} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
