import { LoginRequiredGate } from '@/components/ui/LoginRequiredGate';
import { naira } from '@/constants/format';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

function PaymentPendingContent() {
  const router = useRouter();
  const { amount, reference } = useLocalSearchParams<{ amount?: string; reference?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return <SafeAreaView style={[styles.screen, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F8FAFC' }]} edges={['top', 'bottom']}>
    <View style={[styles.icon, { backgroundColor: colors.accent }]}><Ionicons name="time-outline" size={40} color={colors.primary} /></View>
    <View style={[styles.badge, { backgroundColor: colors.accent }]}><View style={[styles.dot, { backgroundColor: colors.warning }]} /><Text style={[styles.badgeText, { color: colors.primary }]}>AWAITING CONFIRMATION</Text></View>
    <Text style={[styles.title, { color: colors.navy }]}>Payment status pending</Text>
    <Text style={[styles.copy, { color: colors.muted }]}>Paystack checkout has closed. The server will confirm your payment when Paystack sends its notification. Your cart is saved until the order is confirmed.</Text>
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.muted }]}>Amount</Text><Text style={[styles.amount, { color: colors.navy }]}>{naira(amount)}</Text>
      {reference ? <><View style={[styles.divider, { backgroundColor: colors.border }]} /><Text style={[styles.label, { color: colors.muted }]}>Payment reference</Text><Text selectable style={[styles.reference, { color: colors.navy }]}>{reference}</Text></> : null}
    </View>
    <Pressable accessibilityRole="button" onPress={() => router.replace('/order/history')} style={[styles.primary, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>View order history</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></Pressable>
    <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)')} style={[styles.secondary, { borderColor: colors.border }]}><Text style={[styles.secondaryText, { color: colors.primary }]}>Return to home</Text></Pressable>
  </SafeAreaView>;
}

export default function PaymentPendingScreen() { return <LoginRequiredGate><PaymentPendingContent /></LoginRequiredGate>; }

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 82, height: 82, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, marginTop: 21 },
  dot: { width: 7, height: 7, borderRadius: 4 }, badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  title: { marginTop: 15, fontSize: 23, fontWeight: '900', textAlign: 'center' },
  copy: { maxWidth: 340, marginTop: 8, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  card: { width: '100%', marginTop: 24, padding: 18, borderRadius: 17, borderWidth: 1 }, label: { fontSize: 11 }, amount: { marginTop: 5, fontSize: 24, fontWeight: '900' }, divider: { height: StyleSheet.hairlineWidth, marginVertical: 13 }, reference: { marginTop: 4, fontSize: 12, fontWeight: '700' },
  primary: { width: '100%', minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, marginTop: 20 }, primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  secondary: { width: '100%', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, marginTop: 10 }, secondaryText: { fontSize: 13, fontWeight: '800' },
});
