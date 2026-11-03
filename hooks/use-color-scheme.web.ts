import { useThemePreference } from '@/components/providers/theme-preference-provider';

/**
 * Web build reads the shared preference too. The provider starts on 'system'
 * and applies the saved choice after rehydration, keeping static output stable.
 */
export function useColorScheme() {
  return useThemePreference().colorScheme;
}
