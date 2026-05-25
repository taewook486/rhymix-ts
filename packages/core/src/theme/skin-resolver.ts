export type SkinResolution = {
  componentPath: string;
  source: 'override' | 'active' | 'parent' | 'fallback';
};

export interface ResolveSkinOptions {
  /** moduleType:skinName -> componentPath (active theme) */
  themeSkinsMap?: Record<string, string>;
  /** moduleType:skinName -> componentPath (parent theme) */
  parentSkinsMap?: Record<string, string>;
  /** moduleType:skinName -> componentPath (override skins for mid) */
  overrideSkinsMap?: Record<string, string>;
  /** module instance id */
  mid?: string;
  /** skin name override for this mid */
  midSkinOverride?: string | null;
}

const FALLBACK_PATH = 'built-in/default-skin';

/**
 * @MX:ANCHOR: [AUTO] skin resolution 우선순위 핵심 함수
 * @MX:REASON: REQ-THEME-020/021/022 - override → active → parent → fallback 순서 불변
 */
export function resolveSkin(
  moduleType: string,
  skinName: string,
  opts: ResolveSkinOptions,
): SkinResolution {
  const { themeSkinsMap = {}, parentSkinsMap = {}, overrideSkinsMap = {}, midSkinOverride } = opts;

  // 1. mid override가 있으면 overrideSkinsMap에서 찾기
  if (midSkinOverride != null) {
    const overrideKey = `${moduleType}:${midSkinOverride}`;
    const overridePath = overrideSkinsMap[overrideKey];
    if (overridePath !== undefined) {
      return { componentPath: overridePath, source: 'override' };
    }
  }

  // 2. active theme에서 찾기
  const activeKey = `${moduleType}:${skinName}`;
  const activePath = themeSkinsMap[activeKey];
  if (activePath !== undefined) {
    return { componentPath: activePath, source: 'active' };
  }

  // 3. parent theme에서 찾기
  const parentPath = parentSkinsMap[activeKey];
  if (parentPath !== undefined) {
    return { componentPath: parentPath, source: 'parent' };
  }

  // 4. built-in fallback
  return { componentPath: FALLBACK_PATH, source: 'fallback' };
}
