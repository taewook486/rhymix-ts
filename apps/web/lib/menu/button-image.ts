/**
 * 메뉴 버튼 이미지 참조 유틸 — SPEC-LEGACY-PARITY-001 M3 (AC-SITE-010/011).
 *
 * 정합화된 저장 형태(design.md D1)는 `{"image": <file-storage 참조 키>, "alt"?}`.
 * DB의 Prisma Json 값(unknown)을 이 형태로 좁히는 가드와, 참조 키 → 다운로드
 * URL 해석을 제공한다. 공개 렌더러(MenuRenderer)와 관리자 편집 페이지가 함께
 * 쓰는 단일 해석 지점이다.
 */
import { getStorage } from '@rhymix-ts/file';

/** 이미지 참조형 (AC-SITE-011 정합화 형태) */
export interface ButtonImageRef {
  image: string;
  alt?: string;
}

/**
 * unknown 값 → 이미지 참조형 가드.
 *
 * 정합화 외 형태(레거시 {label, href} 스타일 등)는 이미지 없음(null)으로
 * 취급한다 — 공개 렌더는 텍스트 라벨 분기로 폴백한다.
 */
export function asButtonImageRef(value: unknown): ButtonImageRef | null {
  if (!value || typeof value !== 'object') return null;
  const image = (value as { image?: unknown }).image;
  if (typeof image !== 'string' || image.length === 0) return null;
  return value as ButtonImageRef;
}

/**
 * DB 버튼 값 → 다운로드 URL (이미지 없으면 null).
 * 스토리지 백엔드가 발급하는 URL 정책(local: /api/files/by-key/...)을 따른다.
 */
export async function resolveButtonImageUrl(value: unknown): Promise<string | null> {
  const ref = asButtonImageRef(value);
  if (!ref) return null;
  return getStorage().getDownloadUrl({ key: ref.image });
}
