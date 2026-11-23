import { useColorScheme } from 'react-native';

import { useApp } from '@/store/app';

import { themes, type Colors, type ThemeName } from './tokens';

export * from './tokens';

/** Aktives Theme: Dunkel (Standard), Hell oder System. */
export function useTheme(): { c: Colors; name: ThemeName } {
  const mode = useApp((s) => s.themeMode);
  const sys = useColorScheme();
  const name: ThemeName = mode === 'system' ? (sys === 'light' ? 'light' : 'dark') : mode;
  return { c: themes[name], name };
}
