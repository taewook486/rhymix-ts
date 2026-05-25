export type ChangeType = 'token_only' | 'component' | 'mixed';

export interface ThemeChange {
  changedFiles: string[];
}

// 파일이 토큰 전용 변경인지 판별
function isTokenFile(filePath: string): boolean {
  const basename = filePath.split('/').pop() ?? filePath;
  if (basename === 'tokens.css' || basename === 'tokens.json') {
    return true;
  }
  return filePath.endsWith('.css');
}

// 파일이 컴포넌트 변경인지 판별
function isComponentFile(filePath: string): boolean {
  return filePath.endsWith('.tsx') || filePath.endsWith('.ts');
}

// 변경 유형 분류 (REQ-THEME-130/131)
export function classifyChange(change: ThemeChange): ChangeType {
  const { changedFiles } = change;

  if (changedFiles.length === 0) {
    return 'token_only';
  }

  const allToken = changedFiles.every(isTokenFile);
  const allComponent = changedFiles.every(isComponentFile);

  if (allToken) return 'token_only';
  if (allComponent) return 'component';
  return 'mixed';
}
