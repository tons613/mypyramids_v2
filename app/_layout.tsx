import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import type { Auth } from 'firebase/auth';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { ThemePreferenceProvider } from '@/components/providers/theme-preference-provider';
import { Colors } from '@/constants/theme';
import { loadOnboardingSeen } from '@/constants/onboarding';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/endpoints';
import { getAuthDestination, loginSuccess, logout } from '@/store/authSlice';
import { persistor, store, RootState } from '@/store';

export const unstable_settings = { anchor: '(tabs)' };

// Keep the native splash up until the first route is known, so cold starts
// never flash the wrong screen. `hideAsync` below releases it.
void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 250 });
const SPLASH_FALLBACK_MS = 4000;

function SessionGate() {
  const { isAuthenticated, profileLoaded, user, token } = useSelector((state: RootState) => state.auth);
  const segments = useSegments();
  const router = useRouter();
  const dispatch = useDispatch();
  const [seen, setSeen] = useState<boolean | null>(null);
  const [firebaseAuth, setFirebaseAuth] = useState<Auth | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [restoringProfile, setRestoringProfile] = useState(false);
  const restoreStarted = useRef(false);
  const splashReleased = useRef(false);

  // Firebase is large, so load it after the first commit instead of blocking
  // module evaluation. The splash stays visible until this resolves.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const timer = setTimeout(() => {
      void (async () => {
        const [firebaseAuthModule, firebaseConfigModule] = await Promise.all([
          import('firebase/auth'),
          import('@/config/firebase'),
        ]);
        if (cancelled) return;
        setFirebaseAuth(firebaseConfigModule.auth);
        unsubscribe = firebaseAuthModule.onAuthStateChanged(firebaseConfigModule.auth, () => setFirebaseReady(true));
      })();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void SplashScreen.hideAsync().catch(() => {}); }, SPLASH_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadOnboardingSeen().then((value) => {
      if (!cancelled) setSeen(value);
    });
    return () => { cancelled = true; };
  }, []);

  // Recover older persisted sessions that predate profileLoaded/profile fields.
  useEffect(() => {
    if (!isAuthenticated || profileLoaded || !token || restoreStarted.current) return;
    restoreStarted.current = true;
    setRestoringProfile(true);
    authService.getProfile(token)
      .then((profile) => {
        const currentUser = firebaseAuth?.currentUser;
        dispatch(loginSuccess({
          user: {
            ...(user || {}),
            ...profile,
            id: profile?.id ?? user?.id ?? 0,
            uid: profile?.uid || user?.uid || currentUser?.uid || '',
            email: profile?.email || user?.email || currentUser?.email || '',
            phone: profile?.phone || user?.phone || '',
            role: profile?.role || user?.role || 'patient',
            profession: profile?.profession || profile?.doc_profile?.profession || user?.profession || user?.doc_profile?.profession,
          },
          token,
        }));
      })
      .catch(() => dispatch(logout()))
      .finally(() => setRestoringProfile(false));
  }, [isAuthenticated, profileLoaded, token, user, dispatch, firebaseAuth]);

  useEffect(() => {
    if (seen === null || restoringProfile) return;
    const root = segments[0];
    if (!root) return;

    if (isAuthenticated) {
      if (!firebaseReady) return;
      if (!firebaseAuth?.currentUser) {
        dispatch(logout());
        return;
      }
      if (!profileLoaded || !user) return;
      const destination = getAuthDestination(user);

      if (destination === '/(tabs)') {
        // Signed-in users can continue into protected flows outside the tab
        // navigator, such as category browsing, cart, checkout, and support.
        if (['order', 'provider', 'support', 'news', 'chat', 'wallet', 'result-detail', 'pdf-viewer'].includes(root)) return;
        if (root !== '(tabs)') router.replace('/(tabs)');
        return;
      }

      const step = destination === '/auth/verify' ? 'verify' : 'profile';
      if (root !== 'auth' || segments[1] !== step) {
        router.replace({
          pathname: destination,
          params: {
            phone: user.phone,
            email: user.email,
            role: user.role,
            profession: user.profession || user.doc_profile?.profession || '',
          },
        });
      }
      return;
    }

    if (!seen && root !== 'onboarding') {
      // Onboarding updates the persisted cache before navigating to the
      // dashboard, so re-read it here instead of using this mount-time value.
      void loadOnboardingSeen().then((hasSeenOnboarding) => {
        if (hasSeenOnboarding) setSeen(true);
        else router.replace('/onboarding');
      });
      return;
    }

    if (root === 'auth') {
      const publicAuthScreens = ['login', 'category', 'profession', 'register', 'profile'];
      if (!publicAuthScreens.includes(segments[1])) router.replace('/auth/login');
      return;
    }

    if (['(tabs)', 'order', 'support', 'news', 'chat', 'wallet', 'onboarding'].includes(root)) return;
    router.replace('/auth/login');
  }, [seen, isAuthenticated, profileLoaded, user, restoringProfile, firebaseReady, firebaseAuth, segments, router, dispatch]);

  // Release the native splash only once the destination screen is decided.
  useEffect(() => {
    if (splashReleased.current) return;
    if (seen === null || restoringProfile) return;
    if (isAuthenticated && !firebaseReady) return;
    splashReleased.current = true;
    void SplashScreen.hideAsync().catch(() => {});
  }, [seen, restoringProfile, isAuthenticated, firebaseReady]);

  return null;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemePreferenceProvider>
          <ThemedApp />
        </ThemePreferenceProvider>
      </PersistGate>
    </Provider>
  );
}

function ThemedApp() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setStyle(isDark ? 'dark' : 'light');
  }, [isDark]);

  const paperTheme = useMemo(() => {
    const base = isDark ? MD3DarkTheme : MD3LightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: palette.primary,
        secondary: palette.secondary,
        background: palette.background,
        surface: palette.card,
        surfaceVariant: palette.lavender,
        onSurface: palette.text,
        onSurfaceVariant: palette.muted,
        outline: palette.border,
        error: palette.error,
      },
    };
  }, [isDark, palette]);

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: palette.primary,
        background: palette.background,
        card: palette.card,
        text: palette.text,
        border: palette.border,
        notification: palette.error,
      },
    };
  }, [isDark, palette]);

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navigationTheme}>
        <SessionGate />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/category" />
          <Stack.Screen name="auth/profession" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="auth/verify" />
          <Stack.Screen name="auth/profile" />
          <Stack.Screen name="support" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeProvider>
    </PaperProvider>
  );
}
