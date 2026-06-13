'use client';

/**
 * PreviewPane — Center pane of 3-pane admin theme editor.
 *
 * SPEC-THEME-POLISH-001 REQ-THEME-POLISH-005, REQ-THEME-POLISH-006.
 * Preview iframe wrapper with preview-tokens cache key.
 */

interface PreviewPaneProps {
  previewTheme?: string;
  previewKey?: string;
}

export function PreviewPane({ previewTheme = 'default', previewKey = '' }: PreviewPaneProps) {
  const previewUrl = `/?preview-theme=${previewTheme}&preview-tokens=${previewKey}`;

  return (
    <div className="relative w-full h-full border rounded-md overflow-hidden">
      <iframe
        src={previewUrl}
        className="w-full h-full"
        title="테마 미리보기"
        sandbox="allow-same-origin allow-scripts allow-forms"
      />
    </div>
  );
}
