import { auth } from '@/config/firebase';
import { useAuthTheme } from '@/hooks/use-auth-theme';
import { logout } from '@/store/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useDispatch } from 'react-redux';

export function AuthSignOutButton() {
  const dispatch = useDispatch();
  const router = useRouter();
  const authTheme = useAuthTheme();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.warn('Firebase sign out failed', error);
    } finally {
      dispatch(logout());
      router.replace('/auth/login');
      setBusy(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in and continue registration later.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign out"
      disabled={busy}
      onPress={confirmSignOut}
      style={({ pressed }) => [
        styles.button,
        { borderColor: authTheme.fieldBorder, backgroundColor: authTheme.surface },
        pressed && styles.pressed,
        busy && styles.busy,
      ]}
    >
      <Ionicons name="log-out-outline" size={17} color={authTheme.accent} />
      <Text style={[styles.label, { color: authTheme.accentDeep }]}>{busy ? 'Signing out' : 'Sign out'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: { fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  busy: { opacity: 0.6 },
});
