import { AuthScaffold } from '@/components/ui/AuthScaffold';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { GradientButton } from '@/components/ui/GradientButton';
import { useAuthTheme } from '@/hooks/use-auth-theme';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Role = 'patient' | 'provider';

export default function CategoryScreen() {
  const router = useRouter();
  const theme = useAuthTheme();
  const [selected, setSelected] = useState<Role | null>(null);

  const continueNext = () => {
    if (selected === 'provider') router.push('/auth/profession');
    else if (selected === 'patient') router.push({ pathname: '/auth/register', params: { role: 'patient' } });
  };

  return (
    <AuthScaffold showBack>
      <BrandHeader />
      <Text style={[styles.title, { color: theme.heading }]}>
        Choose your{'\n'}
        <Text style={[styles.accent, { color: theme.accent }]}>category</Text>
      </Text>
      <View style={[styles.rule, { backgroundColor: theme.accent }]} />
      <Text style={[styles.subtitle, { color: theme.muted }]}>Select the option that best describes you{'\n'}to get started.</Text>

      <View style={styles.row}>
        <RoleCard
          title="Care Seeker"
          body="I want to book tests, view reports and more"
          source={require('@/assets/lottiefiles/patients.json')}
          selected={selected === 'patient'}
          onPress={() => setSelected('patient')}
        />
        <RoleCard
          title="Health Provider"
          body="Manage patients, orders and diagnostic reports."
          source={require('@/assets/lottiefiles/online-doctor.json')}
          selected={selected === 'provider'}
          onPress={() => setSelected('provider')}
        />
      </View>

      <GradientButton label="Continue" onPress={continueNext} disabled={!selected} />

      <View style={styles.footer}>
        <View style={[styles.pulse, { backgroundColor: theme.surface }]}>
          <Ionicons name="pulse" size={16} color={theme.accent} />
        </View>
        <View style={[styles.line, { backgroundColor: theme.divider }]} />
      </View>
      <Text style={[styles.loginLine, { color: theme.muted }]}>
        Already Registered? <Link href="/auth/login" style={[styles.link, { color: theme.link }]}>Sign In</Link>
      </Text>
    </AuthScaffold>
  );
}

function RoleCard({
  title,
  body,
  source,
  selected,
  onPress,
}: {
  title: string;
  body: string;
  source: any;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useAuthTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${body}`}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.divider },
        selected && { backgroundColor: theme.selectionBg, borderColor: theme.selectionBg },
      ]}
    >
      {selected ? (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark" size={14} color={theme.selectionBg} />
        </View>
      ) : null}
      <View style={[styles.avatar, { backgroundColor: selected ? 'rgba(255,255,255,0.16)' : theme.accentWell }]}>
        <LottieView source={source} autoPlay loop style={{ width: 104, height: 104 }} />
      </View>
      <Text style={[styles.cardTitle, { color: selected ? theme.onSelection : theme.heading }]}>{title}</Text>
      <Text style={[styles.cardBody, { color: selected ? '#EDE9FE' : theme.muted }]}>{body}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center', lineHeight: 36 },
  accent: {},
  rule: { alignSelf: 'center', width: 54, height: 4, borderRadius: 4, marginTop: 8, marginBottom: 12 },
  subtitle: { textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  card: {
    flex: 1,
    minHeight: 250,
    position: 'relative',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatar: { width: 112, height: 112, borderRadius: 56, overflow: 'hidden', marginBottom: 12 },
  cardTitle: { fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  cardBody: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 26, gap: 10 },
  pulse: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, height: 1 },
  loginLine: { textAlign: 'center', marginTop: 10 },
  link: { fontWeight: '700' },
});
