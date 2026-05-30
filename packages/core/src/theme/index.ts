// SPEC-LAYOUT-001 Slice A: layout 서브모듈 exports
export type { LayoutConfig, LayoutContextValue, ParsedExtraVars, ResolveResult } from './layout/types';
export { layoutExtraVarsSchema, parseLayoutExtraVars } from './layout/extra-vars';
export { loadLayoutById, loadLayoutByName } from './layout/loader';
export { resolveLayoutFromInstance } from './layout/resolver-with-db';

// SPEC-LAYOUT-001 Slice B: 렌더 파이프라인 + LayoutContext exports
export { LayoutContext, LayoutProvider, useLayoutContext, useLayoutContextOptional } from './layout/context';
export type { LayoutComponentProps } from './layout/registry';
export { registerLayout, getLayout } from './layout/registry';
export { LayoutSlot } from './layout/slot';
export { renderModuleWithLayout } from './layout/pipeline';

export { parseManifest, type ManifestParseResult } from './manifest-validator';
export { themeManifestSchema, themeTokensSchema, semverRegex } from './types';
export type { ThemeManifest, ThemeTokens, LayoutProps, SkinProps } from './types';
export { resolveLayout } from './resolver';
export type { LayoutResolution, ResolveLayoutOptions } from './resolver';
export { createAssignmentStore } from './assignment-store';
export type { AssignmentEntry, AssignmentStore } from './assignment-store';
export { resolveSkin } from './skin-resolver';
export type { SkinResolution, ResolveSkinOptions } from './skin-resolver';
export { generateCssVariables, generateDarkCssVariables, getTailwindThemeExtension } from './token-css';
export { getDarkModeConfig, buildDarkMediaQuery } from './dark-mode';
export type { DarkModeConfig } from './dark-mode';
export { installTheme } from './installer';
export type { InstallResult, InstalledTheme, InstallOptions } from './installer';
export {
  parsePreviewCookie,
  serializePreviewCookie,
  isPreviewValid,
  createPreviewState,
  PREVIEW_COOKIE_NAME,
  PREVIEW_TTL_MS,
} from './preview';
export type { PreviewState } from './preview';
export { resolveMobileLayout } from './mobile-layout';
export type { MobileLayoutSrl, MobileLayoutResolution } from './mobile-layout';
export { resolveWidgetStyle } from './widget-style';
export type { WidgetStyleEntry, WidgetStyleResolution } from './widget-style';
export { mergeThemeLayers, validateThemeInheritance } from './inheritance';
export type { ThemeLayer, InheritedTheme } from './inheritance';
export { classifyChange } from './hot-swap';
export type { ChangeType, ThemeChange } from './hot-swap';
