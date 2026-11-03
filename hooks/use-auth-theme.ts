import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Tokens for the auth and onboarding surfaces. These screens sit on top of a
 * photo overlay, so they need glassy surfaces that still work in dark mode.
 */
export function useAuthTheme() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const isDark = scheme === 'dark';

  return {
    isDark,
    palette,
    screenBg: isDark ? palette.background : '#F6F3FF',
    overlay: isDark ? 'rgba(10,8,16,0.88)' : 'rgba(243,236,255,0.80)',
    heading: palette.text,
    body: isDark ? '#C9C3DA' : '#4B5563',
    muted: palette.muted,
    accent: palette.primary,
    accentDeep: isDark ? '#C4B5FD' : '#4C1D95',
    link: isDark ? '#C4B5FD' : '#6D28D9',
    error: palette.error,
    success: isDark ? palette.success : '#17803D',
    surface: palette.card,
    surfaceGlass: isDark ? 'rgba(28,24,38,0.94)' : 'rgba(255,255,255,0.78)',
    fieldBg: isDark ? 'rgba(28,24,38,0.9)' : 'rgba(255,255,255,0.72)',
    fieldBorder: isDark ? '#4A4166' : '#C4B5FD',
    placeholder: isDark ? '#8A82A0' : '#C4B5FD',
    divider: isDark ? '#3B3354' : '#DDD6FE',
    accentWell: palette.accent,
    selectionBg: isDark ? '#7C3AED' : '#6D28D9',
    onSelection: '#FFFFFF',
  };
}
