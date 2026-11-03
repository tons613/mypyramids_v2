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

function PaymentFailedContent() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const amount = Array.isArray(params.amount) ? params.amount[0] : params.amount;
  const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const wasCancelled = reason === 'cancelled';
  const retryParams = Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'reason').map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F8FAFC' }]} edges={['top', 'bottom']}>
      <View style={[styles.iconWrap, { backgroundColor: colors.peach }]}><Ionicons name={wasCancelled ? 'close' : 'alert-outline'} size={39} color={colors.warning} /></View>
      <View style={[styles.statusPill, { backgroundColor: colors.peach }]}><View style={[styles.statusDot, { backgroundColor: colors.warning }]} /><Text style={[styles.statusText, { color: colors.warning }]}>{wasCancelled ? 'PAYMENT CANCELLED' : 'PAYMENT NOT COMPLETED'}</Text></View>
      <Text style={[styles.title, { color: colors.navy }]}>{wasCancelled ? 'Payment cancelled' : 'We couldn’t complete payment'}</Text>
      <Text style={[styles.description, { color: colors.muted }]}>{wasCancelled ? 'No payment was completed. Your cart is saved, and you can try again whenever you’re ready.' : 'Your payment did not go through. Your cart is still saved, so you can choose a method and try again.'}</Text>
      <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.summaryLabel, { color: colors.muted }]}>Amount due</Text>
        <Text style={[styles.amount, { color: colors.navy }]}>{naira(amount)}</Text>
        {!wasCancelled && reason && reason !== 'Payment could not be completed.' ? <Text style={[styles.reason, { color: colors.muted }]}>{reason}</Text> : null}
      </View>
      <Pressable onPress={() => router.replace({ pathname: '/order/payment-method', params: retryParams })} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Ionicons name="refresh" size={18} color="#FFFFFF" /><Text style={styles.primaryText}>Choose payment method</Text></Pressable>
      <Pressable onPress={() => router.replace('/order/cart')} style={[styles.secondaryButton, { borderColor: colors.border }]}><Text style={[styles.secondaryText, { color: colors.primary }]}>Return to cart</Text></Pressable>
    </SafeAreaView>
  );
}

export default function PaymentFailedScreen() { return <LoginRequiredGate><PaymentFailedContent /></LoginRequiredGate>; }

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, iconWrap: { width: 84, height: 84, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, marginTop: 22 }, statusDot: { width: 7, height: 7, borderRadius: 4 }, statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  title: { marginTop: 15, fontSize: 23, fontWeight: '900', textAlign: 'center' }, description: { maxWidth: 330, marginTop: 8, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  summary: { width: '100%', marginTop: 24, padding: 18, borderRadius: 17, borderWidth: 1 }, summaryLabel: { fontSize: 11 }, amount: { marginTop: 5, fontSize: 24, fontWeight: '900' }, reason: { marginTop: 9, fontSize: 11, lineHeight: 16 },
  primaryButton: { width: '100%', minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, marginTop: 20 }, primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }, secondaryButton: { width: '100%', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, marginTop: 10 }, secondaryText: { fontSize: 13, fontWeight: '800' },
});
