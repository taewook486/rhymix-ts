export interface ThemeLayer {
  name: string;
  layouts: Record<string, string>;
  skins: Record<string, string>;
  tokens?: Record<string, string>;
}

export interface InheritedTheme {
  layouts: Record<string, string>;
  skins: Record<string, string>;
  tokens: Record<string, string>;
}

// child가 parent를 단일 레벨로 상속 (REQ-THEME-111)
export function mergeThemeLayers(child: ThemeLayer, parent?: ThemeLayer): InheritedTheme {
  if (!parent) {
    return {
      layouts: { ...child.layouts },
      skins: { ...child.skins },
      tokens: { ...(child.tokens ?? {}) },
    };
  }

  return {
    layouts: { ...parent.layouts, ...child.layouts },
    skins: { ...parent.skins, ...child.skins },
    tokens: { ...(parent.tokens ?? {}), ...(child.tokens ?? {}) },
  };
}

// child가 설치 가능한지 parent 존재 여부를 검증
export function validateThemeInheritance(opts: {
  childManifestParent?: string;
  installedThemeNames: string[];
}): { valid: boolean; error?: 'PARENT_THEME_MISSING'; parentName?: string } {
  const { childManifestParent, installedThemeNames } = opts;

  // parent가 선언되지 않으면 항상 유효
  if (!childManifestParent) {
    return { valid: true };
  }

  // parent가 설치되어 있으면 유효
  if (installedThemeNames.includes(childManifestParent)) {
    return { valid: true };
  }

  // parent가 선언되었지만 설치되지 않음
  return {
    valid: false,
    error: 'PARENT_THEME_MISSING',
    parentName: childManifestParent,
  };
}
