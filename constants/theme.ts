import { Platform } from 'react-native';

const tintColorLight = '#6D28D9';
const tintColorDark = '#C4B5FD';

export const Colors = {
  light: {
    text: '#111111',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    primary: '#6D28D9',
    secondary: '#4C1D95',
    accent: '#F3E8FF',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F97316',
    card: '#FFFFFF',
    border: '#EDE9FE',
    muted: '#6B7280',
    lavender: '#F6F3FF',
    navy: '#1E1B4B',
    peach: '#FFF1E8',
  },
  dark: {
    text: '#F5F3FF',
    background: '#12101A',
    tint: tintColorDark,
    icon: '#A1A1AA',
    tabIconDefault: '#A1A1AA',
    tabIconSelected: tintColorDark,
    primary: '#A78BFA',
    secondary: '#C4B5FD',
    accent: '#2E1065',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FDBA74',
    card: '#1C1826',
    border: '#3B3354',
    muted: '#A1A1AA',
    lavender: '#1C1826',
    // `navy` is the heading/foreground tone in both themes; in dark mode it must
    // stay light, otherwise headings and icons render dark-on-dark.
    navy: '#EDE9FE',
    peach: '#2A2118',
  },
};

export const Gradient = ['#5B2CDB', '#7C3AED', '#C084FC'] as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
