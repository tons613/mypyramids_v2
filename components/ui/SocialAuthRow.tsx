import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuthTheme } from '@/hooks/use-auth-theme';

const ICONS = ['logo-google', 'logo-facebook', 'logo-twitter'] as const;

export function SocialAuthRow({ caption = 'Or continue with' }: { caption?: string }) {
  const unavailable = () => Alert.alert('Unavailable', 'Social sign-in is not available yet.');
  const auth = useAuthTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.lineRow}>
        <View style={[styles.line, { backgroundColor: auth.divider }]} />
        <Text style={[styles.caption, { color: auth.muted }]}>{caption}</Text>
        <View style={[styles.line, { backgroundColor: auth.divider }]} />
      </View>
      <View style={styles.row}>
        {ICONS.map((name) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={`Continue with ${name.replace('logo-', '')}`}
            onPress={unavailable}
            style={[styles.button, { backgroundColor: auth.surface, borderColor: auth.divider }]}
          >
            <Ionicons name={name} size={22} color={name === 'logo-facebook' ? '#1877F2' : name === 'logo-twitter' ? '#1DA1F2' : '#EA4335'} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  line: { flex: 1, height: 1 },
  caption: { fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  button: {
    width: 52,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D28D9',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
