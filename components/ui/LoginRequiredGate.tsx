import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RootState } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

/** Blocks protected screen content and prompts signed-out users to sign in. */
export function LoginRequiredGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const prompted = useRef(false);

  useEffect(() => {
    if (isAuthenticated || prompted.current) return;
    prompted.current = true;
    Alert.alert(
      'Login required',
      'Please sign in to continue. You can keep browsing without an account.',
      [
        { text: 'Keep browsing', style: 'cancel', onPress: () => router.replace('/(tabs)') },
        { text: 'Sign in', onPress: () => router.replace('/auth/login') },
      ],
      { cancelable: false },
    );
  }, [isAuthenticated, router]);

  if (isAuthenticated) return <>{children}</>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F8FAFC' }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconWell, { backgroundColor: colors.accent }]}>
          <Ionicons name="lock-closed-outline" size={25} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.navy }]}>Sign in to continue</Text>
        <Text style={[styles.description, { color: colors.muted }]}>Sign in to access this part of your account, or keep browsing tests.</Text>
        <Pressable onPress={() => router.replace('/auth/login')} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={styles.buttonText}>Sign in</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.browseButton}>
          <Text style={[styles.browseText, { color: colors.primary }]}>Continue browsing</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 390, alignItems: 'center', padding: 24, borderRadius: 24, borderWidth: 1 },
  iconWell: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  title: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  description: { maxWidth: 290, marginTop: 8, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  button: { minHeight: 46, minWidth: 160, alignItems: 'center', justifyContent: 'center', marginTop: 21, paddingHorizontal: 20, borderRadius: 14 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  browseButton: { marginTop: 14, padding: 8 },
  browseText: { fontSize: 13, fontWeight: '700' },
});
