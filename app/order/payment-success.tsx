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

function PaymentSuccessContent() {
  const router = useRouter();
  const { amount, reference } = useLocalSearchParams<{ amount?: string; reference?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F8FAFC' }]} edges={['top', 'bottom']}>
      <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}><Ionicons name="checkmark" size={42} color={colors.primary} /></View>
      <View style={[styles.statusPill, { backgroundColor: colors.accent }]}><View style={[styles.statusDot, { backgroundColor: colors.success }]} /><Text style={[styles.statusText, { color: colors.primary }]}>PAYMENT CONFIRMED</Text></View>
      <Text style={[styles.title, { color: colors.navy }]}>You’re all set</Text>
      <Text style={[styles.description, { color: colors.muted }]}>Your payment was successful and your test order is confirmed. We’ll keep you updated on what happens next.</Text>
      <View style={[styles.receipt, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.receiptLabel, { color: colors.muted }]}>Amount paid</Text>
        <Text style={[styles.receiptAmount, { color: colors.navy }]}>{naira(amount)}</Text>
        {reference ? <><View style={[styles.divider, { backgroundColor: colors.border }]} /><Text style={[styles.referenceLabel, { color: colors.muted }]}>Payment reference</Text><Text selectable style={[styles.reference, { color: colors.navy }]}>{reference}</Text></> : null}
      </View>
      <Pressable onPress={() => router.replace('/(tabs)')} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Go to dashboard</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></Pressable>
      <Pressable onPress={() => router.replace('/order/history')} style={[styles.secondaryButton, { borderColor: colors.border }]}><Text style={[styles.secondaryText, { color: colors.primary }]}>View order history</Text></Pressable>
    </SafeAreaView>
  );
}

export default function PaymentSuccessScreen() { return <LoginRequiredGate><PaymentSuccessContent /></LoginRequiredGate>; }

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, iconWrap: { width: 84, height: 84, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, marginTop: 22 }, statusDot: { width: 7, height: 7, borderRadius: 4 }, statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  title: { marginTop: 15, fontSize: 25, fontWeight: '900', textAlign: 'center' }, description: { maxWidth: 330, marginTop: 8, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  receipt: { width: '100%', marginTop: 25, padding: 18, borderWidth: 1, borderRadius: 17 }, receiptLabel: { fontSize: 11 }, receiptAmount: { marginTop: 5, fontSize: 24, fontWeight: '900' }, divider: { height: StyleSheet.hairlineWidth, marginVertical: 13 }, referenceLabel: { fontSize: 10 }, reference: { marginTop: 4, fontSize: 12, fontWeight: '700' },
  primaryButton: { width: '100%', minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, marginTop: 20 }, primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }, secondaryButton: { width: '100%', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, marginTop: 10 }, secondaryText: { fontSize: 13, fontWeight: '800' },
});
