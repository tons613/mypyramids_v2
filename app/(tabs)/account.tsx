import { auth } from '@/config/firebase';
import { Colors } from '@/constants/theme';
import { ThemePreference } from '@/constants/theme-preference';
import { LoginRequiredGate } from '@/components/ui/LoginRequiredGate';
import { useThemePreference } from '@/components/providers/theme-preference-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RootState } from '@/store';
import { logout } from '@/store/authSlice';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { signOut as firebaseSignOut } from 'firebase/auth';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

type ThemeColors = typeof Colors.light | typeof Colors.dark;

const themeOptions: {
  value: ThemePreference;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

function getInitial(user: RootState['auth']['user']) {
  const name = user?.firstname || user?.email?.split('@')[0] || 'U';
  return name.trim().charAt(0).toUpperCase() || 'U';
}

function getFullName(user: RootState['auth']['user']) {
  const name = [user?.firstname, user?.lastname].filter(Boolean).join(' ').trim();
  return name || user?.email?.split('@')[0] || 'Your account';
}

function AccountContent() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme];
  const { preference, setPreference } = useThemePreference();
  const isDark = colorScheme === 'dark';

  const screenBackground = isDark ? palette.background : '#FCFAFF';
  const heroColors = isDark
    ? (['#33205F', '#482A8F', '#6C43C4'] as const)
    : (['#5326B7', '#7939E8', '#A471EF'] as const);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await firebaseSignOut(auth).catch((error) => {
            console.warn('Firebase sign out failed', error);
          });
          dispatch(logout());
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete account', 'This action is irreversible. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => console.log('Delete account') },
    ]);
  };

  const role = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Patient';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: screenBackground }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.navy }]}>Account</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            Manage your profile, preferences, and security.
          </Text>
        </View>

        <LinearGradient
          colors={[...heroColors]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroOrbit} pointerEvents="none" />
          <View style={styles.heroTop}>
            <View style={styles.avatar}>
              <Text style={[styles.avatarLabel, { color: '#6D28D9' }]}>{getInitial(user)}</Text>
            </View>
            <View style={styles.heroIdentity}>
              <Text numberOfLines={1} style={styles.heroName}>
                {getFullName(user)}
              </Text>
              <Text numberOfLines={1} style={styles.heroEmail}>
                {user?.email || 'No email on file'}
              </Text>
              <View style={styles.roleChip}>
                <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
                <Text style={styles.roleChipText}>{role}</Text>
              </View>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => router.push('/auth/profile')}
            style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
          >
            <Ionicons name="create-outline" size={15} color="#5B21B6" />
            <Text style={styles.heroButtonText}>Edit profile</Text>
          </Pressable>
        </LinearGradient>

        <Text style={[styles.sectionLabel, { color: palette.muted }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={[styles.segment, { backgroundColor: isDark ? '#241E33' : '#F4EFFB' }]}>
            {themeOptions.map((option) => {
              const selected = preference === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${option.label} theme`}
                  onPress={() => setPreference(option.value)}
                  style={({ pressed }) => [
                    styles.segmentOption,
                    selected && { backgroundColor: isDark ? '#7C3AED' : palette.primary },
                    pressed && !selected && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={17}
                    color={selected ? '#FFFFFF' : palette.muted}
                  />
                  <Text
                    style={[styles.segmentLabel, { color: selected ? '#FFFFFF' : palette.muted }]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.segmentHint, { color: palette.muted }]}>
            {preference === 'system'
              ? 'Following your device setting.'
              : `Always using the ${preference} theme.`}
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: palette.muted }]}>YOUR ACCOUNT</Text>
        <View
          style={[
            styles.card,
            styles.rowCard,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          <MenuRow
            icon="person-outline"
            title="View profile"
            subtitle="Update your personal details"
            palette={palette}
            isDark={isDark}
            onPress={() => router.push('/auth/profile')}
          />
          <MenuRow
            icon="wallet-outline"
            title="Manage wallet"
            subtitle="Top up and review transactions"
            palette={palette}
            isDark={isDark}
            onPress={() => router.push('/wallet')}
          />
          <MenuRow
            icon="receipt-outline"
            title="Order history"
            subtitle="Revisit your past bookings"
            palette={palette}
            isDark={isDark}
            onPress={() => router.push('/order/history')}
          />
          <MenuRow
            icon="document-text-outline"
            title="My results"
            subtitle="Open your test reports"
            palette={palette}
            isDark={isDark}
            onPress={() => router.push('/(tabs)/results')}
            isLast
          />
        </View>

        <Text style={[styles.sectionLabel, { color: palette.muted }]}>SUPPORT</Text>
        <View
          style={[
            styles.card,
            styles.rowCard,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          <MenuRow
            icon="headset-outline"
            title="Help & support"
            subtitle="Talk to our care team"
            palette={palette}
            isDark={isDark}
            onPress={() => router.push('/support')}
          />
          <MenuRow
            icon="newspaper-outline"
            title="News & updates"
            subtitle="Guidance and announcements"
            palette={palette}
            isDark={isDark}
            onPress={() => router.push('/news')}
            isLast
          />
        </View>

        <View
          style={[
            styles.card,
            styles.rowCard,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          <MenuRow
            icon="log-out-outline"
            title="Log out"
            palette={palette}
            isDark={isDark}
            tone="danger"
            onPress={handleLogout}
          />
          <MenuRow
            icon="trash-outline"
            title="Delete account"
            palette={palette}
            isDark={isDark}
            tone="danger"
            onPress={handleDeleteAccount}
            isLast
          />
        </View>

        <Text style={[styles.footer, { color: palette.muted }]}>
          MyPyramids · Version {Constants.expoConfig?.version || '1.0.0'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  palette,
  isDark,
  tone = 'default',
  isLast = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void;
  palette: ThemeColors;
  isDark: boolean;
  tone?: 'default' | 'danger';
  isLast?: boolean;
}) {
  const isDanger = tone === 'danger';
  const tint = isDanger ? palette.error : palette.primary;
  const iconBackground = isDanger
    ? isDark
      ? 'rgba(248,113,113,0.14)'
      : '#FEE9E9'
    : isDark
      ? 'rgba(167,139,250,0.16)'
      : palette.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: palette.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={19} color={tint} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={[styles.menuTitle, { color: isDanger ? palette.error : palette.navy }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.menuSubtitle, { color: palette.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={17} color={palette.muted} />
    </Pressable>
  );
}

export default function AccountScreen() {
  return (
    <LoginRequiredGate>
      <AccountContent />
    </LoginRequiredGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 130 },
  header: { paddingTop: 12, paddingBottom: 18 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 19 },
  hero: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#5B21B6',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 6,
  },
  heroOrbit: {
    position: 'absolute',
    right: -70,
    top: -90,
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { fontSize: 24, fontWeight: '700' },
  heroIdentity: { flex: 1 },
  heroName: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  heroEmail: { color: 'rgba(255,255,255,0.76)', fontSize: 12, marginTop: 3 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 9,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  roleChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  heroButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 15,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  heroButtonText: { color: '#5B21B6', fontSize: 12, fontWeight: '700' },
  sectionLabel: {
    marginTop: 24,
    marginBottom: 9,
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  card: { borderRadius: 20, borderWidth: 1 },
  rowCard: { overflow: 'hidden' },
  segment: { flexDirection: 'row', gap: 6, margin: 10, padding: 5, borderRadius: 15 },
  segmentOption: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 11,
  },
  segmentLabel: { fontSize: 12, fontWeight: '600' },
  segmentHint: {
    marginHorizontal: 18,
    marginTop: 2,
    marginBottom: 16,
    fontSize: 11.5,
    lineHeight: 17,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    minHeight: 62,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCopy: { flex: 1 },
  menuTitle: { fontSize: 14, fontWeight: '600' },
  menuSubtitle: { fontSize: 11.5, marginTop: 3 },
  footer: { marginTop: 26, textAlign: 'center', fontSize: 11 },
  pressed: { opacity: 0.8 },
});
