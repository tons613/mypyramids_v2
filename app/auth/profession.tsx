import { AuthScaffold } from '@/components/ui/AuthScaffold';
import { GradientButton } from '@/components/ui/GradientButton';
import { useAuthTheme } from '@/hooks/use-auth-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const ROLES: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Doctor', icon: 'medkit-outline' },
  { label: 'Nurse', icon: 'briefcase-outline' },
  { label: 'Pharmacist', icon: 'medkit-outline' },
  { label: 'Lab Scientist', icon: 'flask-outline' },
  { label: 'Physiotherapist', icon: 'body-outline' },
  { label: 'Others', icon: 'ellipsis-horizontal' },
];

export default function ProfessionScreen() {
  const router = useRouter();
  const theme = useAuthTheme();
  const [selected, setSelected] = useState('');

  return (
    <AuthScaffold showBack>
      <View style={[styles.iconWrap, { backgroundColor: theme.surface }]}>
        <Ionicons name="person-outline" size={28} color={theme.accent} />
      </View>
      <Text style={[styles.title, { color: theme.heading }]}>Select your role</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>Choose the option that best describes you</Text>

      {ROLES.map((role) => {
        const on = selected === role.label;
        return (
          <Pressable
            key={role.label}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={role.label}
            onPress={() => setSelected(role.label)}
            style={[
              styles.row,
              { backgroundColor: theme.surface, borderWidth: 1.5, borderColor: on ? theme.accent : 'transparent' },
            ]}
          >
            <View style={[styles.glyph, { backgroundColor: theme.accentWell }]}>
              <Ionicons name={role.icon} size={18} color={theme.accent} />
            </View>
            <Text style={[styles.label, { color: theme.heading }]}>{role.label}</Text>
            <View style={[styles.radio, { borderColor: on ? theme.accent : theme.fieldBorder }]}>
              {on ? <View style={[styles.dot, { backgroundColor: theme.accent }]} /> : null}
            </View>
          </Pressable>
        );
      })}

      <View style={{ height: 12 }} />
      <GradientButton
        label="Continue"
        disabled={!selected}
        onPress={() => router.push({ pathname: '/auth/register', params: { role: 'provider', profession: selected } })}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignSelf: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: 6, marginBottom: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 16, fontWeight: '600' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
