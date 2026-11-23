/** Design-Tokens aus designs/app-demo.html (.screen / .screen[data-theme=light]). */
export type ThemeName = 'dark' | 'light';
export type ThemeMode = ThemeName | 'system';

export interface Colors {
  bg: string;
  card: string;
  card2: string;
  line: string;
  text: string;
  muted: string;
  acc: string;
  on: string;
  soft: string;
  tab: string;
  ok: string;
  okSoft: string;
  danger: string;
  /** Hintergrund der dunklen Heldenkarten (auch im Light-Theme dunkel) */
  hero: string;
}

export const ORANGE = '#F2611D';
export const INK = '#0a0a0b';

export const themes: Record<ThemeName, Colors> = {
  dark: {
    bg: '#0a0a0b',
    card: '#141416',
    card2: '#1c1c1f',
    line: '#26262a',
    text: '#f4f4f5',
    muted: '#8f8f98',
    acc: ORANGE,
    on: '#0a0a0b',
    soft: 'rgba(242,97,29,0.14)',
    tab: 'rgba(10,10,11,0.72)',
    ok: '#22c55e',
    okSoft: 'rgba(34,197,94,0.14)',
    danger: '#ef4444',
    hero: '#1b1b1e',
  },
  light: {
    bg: '#f5f3ef',
    card: '#ffffff',
    card2: '#efece6',
    line: '#e6e2db',
    text: '#141414',
    muted: '#77736c',
    acc: '#ea5a14',
    on: '#ffffff',
    soft: '#fdeee5',
    tab: 'rgba(255,255,255,0.75)',
    ok: '#16a34a',
    okSoft: 'rgba(22,163,74,0.14)',
    danger: '#ef4444',
    hero: '#141414',
  },
};

/** Abstände: 20 Rand, 16 innen, 14 zwischen Karten. */
export const space = { edge: 20, inner: 16, gap: 14 } as const;
export const radius = { card: 20, hero: 24, pill: 999, tile: 12 } as const;

export const font = {
  display: 'Anton_400Regular',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  heavy: 'Inter_800ExtraBold',
} as const;
