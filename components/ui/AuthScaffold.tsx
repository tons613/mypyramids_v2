import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthTheme } from '@/hooks/use-auth-theme';

type Props = {
  children: React.ReactNode;
  showBack?: boolean;
};

export function AuthScaffold({ children, showBack }: Props) {
  const router = useRouter();
  const auth = useAuthTheme();

  return (
    <View style={[styles.root, { backgroundColor: auth.screenBg }]}>
      <Image source={require('@/assets/images/banners/login.jpeg')} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[styles.tint, { backgroundColor: auth.overlay }]} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={[styles.back, { backgroundColor: auth.surface, borderColor: auth.divider }]}
            >
              <Ionicons name="chevron-back" size={22} color={auth.accentDeep} />
            </Pressable>
          ) : (
            <View style={{ height: 8 }} />
          )}
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tint: { ...StyleSheet.absoluteFill },
  safe: { flex: 1 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    marginTop: 4,
    shadowColor: '#6D28D9',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
});
