export interface WidgetStyleEntry {
  name: string;
  componentPath: string;
}

export type WidgetStyleResolution =
  | { componentPath: string; source: 'instance' | 'theme_default' | 'fallback' };

const FALLBACK_PATH = 'built-in/default-widget-style';

export function resolveWidgetStyle(opts: {
  instanceStyleName?: string | null;
  themeWidgetStyles?: WidgetStyleEntry[];
  defaultStyleName?: string | null;
}): WidgetStyleResolution {
  const { instanceStyleName, themeWidgetStyles = [], defaultStyleName } = opts;

  // instanceStyleName이 있으면 themeWidgetStyles에서 검색
  if (instanceStyleName) {
    const found = themeWidgetStyles.find((s) => s.name === instanceStyleName);
    if (found) {
      return { componentPath: found.componentPath, source: 'instance' };
    }
    // 이름이 있지만 목록에 없으면 fallback
    return { componentPath: FALLBACK_PATH, source: 'fallback' };
  }

  // defaultStyleName이 있으면 themeWidgetStyles에서 검색
  if (defaultStyleName) {
    const found = themeWidgetStyles.find((s) => s.name === defaultStyleName);
    if (found) {
      return { componentPath: found.componentPath, source: 'theme_default' };
    }
    // 이름이 있지만 목록에 없으면 fallback
    return { componentPath: FALLBACK_PATH, source: 'fallback' };
  }

  // 아무것도 없으면 fallback
  return { componentPath: FALLBACK_PATH, source: 'fallback' };
}
