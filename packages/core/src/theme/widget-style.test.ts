import { describe, it, expect } from 'vitest';
import { resolveWidgetStyle } from './widget-style';

describe('resolveWidgetStyle', () => {
  const styles = [
    { name: 'modern', componentPath: 'theme/widgets/modern' },
    { name: 'classic', componentPath: 'theme/widgets/classic' },
  ];

  // WS-1: instanceStyleName found in themeWidgetStyles → source='instance'
  it('WS-1: returns instance source when instanceStyleName is found in themeWidgetStyles', () => {
    const result = resolveWidgetStyle({
      instanceStyleName: 'modern',
      themeWidgetStyles: styles,
      defaultStyleName: 'classic',
    });
    expect(result).toEqual({
      componentPath: 'theme/widgets/modern',
      source: 'instance',
    });
  });

  // WS-2: no instance override, defaultStyleName found → source='theme_default'
  it('WS-2: returns theme_default source when defaultStyleName is found and no instance override', () => {
    const result = resolveWidgetStyle({
      instanceStyleName: null,
      themeWidgetStyles: styles,
      defaultStyleName: 'classic',
    });
    expect(result).toEqual({
      componentPath: 'theme/widgets/classic',
      source: 'theme_default',
    });
  });

  // WS-3: neither set → source='fallback', built-in path
  it('WS-3: returns fallback when neither instanceStyleName nor defaultStyleName is set', () => {
    const result = resolveWidgetStyle({
      instanceStyleName: null,
      themeWidgetStyles: styles,
      defaultStyleName: null,
    });
    expect(result).toEqual({
      componentPath: 'built-in/default-widget-style',
      source: 'fallback',
    });
  });

  // WS-4: instanceStyleName set but not in themeWidgetStyles → fallback
  it('WS-4: returns fallback when instanceStyleName is not found in themeWidgetStyles', () => {
    const result = resolveWidgetStyle({
      instanceStyleName: 'nonexistent',
      themeWidgetStyles: styles,
      defaultStyleName: 'classic',
    });
    expect(result).toEqual({
      componentPath: 'built-in/default-widget-style',
      source: 'fallback',
    });
  });

  // WS-5: themeWidgetStyles empty, has defaultStyleName → fallback
  it('WS-5: returns fallback when themeWidgetStyles is empty even if defaultStyleName is set', () => {
    const result = resolveWidgetStyle({
      instanceStyleName: null,
      themeWidgetStyles: [],
      defaultStyleName: 'classic',
    });
    expect(result).toEqual({
      componentPath: 'built-in/default-widget-style',
      source: 'fallback',
    });
  });
});
