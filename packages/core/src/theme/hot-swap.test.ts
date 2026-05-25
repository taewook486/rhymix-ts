import { describe, it, expect } from 'vitest';
import { classifyChange } from './hot-swap';

describe('classifyChange', () => {
  // HS-1: only tokens.css changed → 'token_only'
  it('HS-1: classifies tokens.css as token_only', () => {
    const result = classifyChange({ changedFiles: ['tokens.css'] });
    expect(result).toBe('token_only');
  });

  // HS-2: only tokens.json changed → 'token_only'
  it('HS-2: classifies tokens.json as token_only', () => {
    const result = classifyChange({ changedFiles: ['tokens.json'] });
    expect(result).toBe('token_only');
  });

  // HS-3: only .tsx file changed → 'component'
  it('HS-3: classifies .tsx file as component', () => {
    const result = classifyChange({ changedFiles: ['components/Layout.tsx'] });
    expect(result).toBe('component');
  });

  // HS-4: tokens.css + layout.tsx → 'mixed'
  it('HS-4: classifies mix of token and component files as mixed', () => {
    const result = classifyChange({ changedFiles: ['tokens.css', 'components/layout.tsx'] });
    expect(result).toBe('mixed');
  });

  // HS-5: only .css files → 'token_only'
  it('HS-5: classifies all .css files as token_only', () => {
    const result = classifyChange({ changedFiles: ['style.css', 'components/card.css'] });
    expect(result).toBe('token_only');
  });

  // HS-6: only .ts files → 'component'
  it('HS-6: classifies all .ts files as component', () => {
    const result = classifyChange({ changedFiles: ['utils/helpers.ts', 'hooks/useTheme.ts'] });
    expect(result).toBe('component');
  });
});
