import { LoginRequiredGate } from '@/components/ui/LoginRequiredGate';
import { naira } from '@/constants/format';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

type OrderLine = { test_id?: number; testname?: string | { testname?: string }; amount?: number | string; status?: number; report_file?: string | null };
type Order = {
  request_id?: number;
  order_reference?: string | null;
  created_at?: string | null;
  subtotal?: number | string;
  discount?: number | string;
  additional_charge?: number | string;
  netamount?: number | string;
  status?: number | string;
  branch?: string | null;
  branch_accepted?: string | null;
  clinicalinfo?: string | null;
  referrer?: string | null;
  order_list?: OrderLine[];
};

function OrderHistoryDetailContent() {
  const router = useRouter();
  const { order: orderParam } = useLocalSearchParams<{ order?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const order = useMemo<Order | null>(() => {
    if (!orderParam) return null;
    try { return JSON.parse(Array.isArray(orderParam) ? orderParam[0] : orderParam) as Order; } catch { return null; }
  }, [orderParam]);

  const date = order?.created_at ? new Date(order.created_at) : null;
  const formattedDate = date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Date unavailable';
  const statusValue = Number(order?.status);
  const status = statusValue === 0 ? 'Pending' : statusValue === 1 ? 'Accepted' : statusValue === 2 ? 'In progress' : String(order?.status ?? 'Unavailable');
  const orderLines = Array.isArray(order?.order_list) ? order.order_list : [];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F8FAFC' }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to order history" onPress={() => router.back()} style={[styles.backButton, { borderColor: colors.border }]}><Ionicons name="arrow-back" size={21} color={colors.navy} /></Pressable>
        <View style={styles.headerCopy}><Text style={[styles.title, { color: colors.navy }]}>Order details</Text><Text numberOfLines={1} style={[styles.subtitle, { color: colors.muted }]}>{order?.order_reference || 'Diagnostic order'}</Text></View>
      </View>

      {!order ? (
        <View style={styles.missingState}><Text style={[styles.missingTitle, { color: colors.navy }]}>Order details unavailable</Text><Text style={[styles.missingCopy, { color: colors.muted }]}>Return to order history and select an order to view its details.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
            <View style={styles.heroTop}><View style={styles.heroIcon}><Ionicons name="receipt-outline" size={20} color="#FFFFFF" /></View><View style={styles.heroStatus}><View style={[styles.statusDot, { backgroundColor: statusValue > 0 ? '#4ADE80' : '#FCD34D' }]} /><Text style={styles.heroStatusText}>{status}</Text></View></View>
            <Text style={styles.heroLabel}>ORDER TOTAL</Text>
            <Text style={styles.heroAmount}>{naira(order.netamount)}</Text>
            <Text style={styles.heroDate}>{formattedDate}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>Payment summary</Text>
            <SummaryRow label="Tests and packages" value={naira(order.subtotal)} colors={colors} />
            <SummaryRow label="Discount" value={naira(order.discount)} colors={colors} />
            <SummaryRow label="Collection charge" value={naira(order.additional_charge)} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SummaryRow label="Total paid" value={naira(order.netamount)} colors={colors} strong />
            {order.branch_accepted || order.branch ? <SummaryRow label="Collection centre" value={order.branch_accepted || order.branch || ''} colors={colors} /> : null}
            {order.referrer ? <SummaryRow label="Referred by" value={order.referrer} colors={colors} /> : null}
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.navy }]}>Tests in this order</Text><Text style={[styles.count, { color: colors.muted }]}>{orderLines.length}</Text></View>
            {orderLines.length ? orderLines.map((line, index) => {
              const name = typeof line.testname === 'string' ? line.testname : line.testname?.testname || `Test ${line.test_id ?? index + 1}`;
              const hasReport = Boolean(line.report_file);
              return <View key={`${line.test_id ?? index}-${index}`} style={[styles.testRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <View style={[styles.testIcon, { backgroundColor: colors.accent }]}><Ionicons name={hasReport ? 'document-text-outline' : 'flask-outline'} size={17} color={colors.primary} /></View>
                <View style={styles.testCopy}><Text style={[styles.testName, { color: colors.navy }]}>{name}</Text><Text style={[styles.testStatus, { color: hasReport ? colors.success : colors.muted }]}>{hasReport ? 'Result available' : Number(line.status) === 2 ? 'In progress' : 'Awaiting processing'}</Text></View>
                <Text style={[styles.testAmount, { color: colors.navy }]}>{naira(line.amount)}</Text>
              </View>;
            }) : <Text style={[styles.emptyTests, { color: colors.muted }]}>Test details are not available for this order.</Text>}
          </View>

          {order.clinicalinfo ? <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.navy }]}>Clinical notes</Text><Text style={[styles.notes, { color: colors.muted }]}>{order.clinicalinfo}</Text></View> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, colors, strong = false }: { label: string; value: string; colors: typeof Colors.light; strong?: boolean }) {
  return <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: strong ? colors.navy : colors.muted, fontWeight: strong ? '800' : '400' }]}>{label}</Text><Text style={[styles.summaryValue, { color: colors.navy }, strong && styles.strongValue]}>{value}</Text></View>;
}

export default function OrderHistoryDetailScreen() { return <LoginRequiredGate><OrderHistoryDetailContent /></LoginRequiredGate>; }

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth }, backButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1 }, title: { fontSize: 19, fontWeight: '800' }, subtitle: { fontSize: 11, marginTop: 3 },
  content: { padding: 16, paddingBottom: 30, gap: 12 }, heroCard: { padding: 18, borderRadius: 19 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heroIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }, heroStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }, statusDot: { width: 7, height: 7, borderRadius: 4 }, heroStatusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' }, heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 19 }, heroAmount: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 4 }, heroDate: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 4 },
  card: { borderRadius: 17, borderWidth: 1, padding: 15 }, sectionTitle: { fontSize: 14, fontWeight: '800' }, summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }, summaryLabel: { fontSize: 11, flex: 1 }, summaryValue: { fontSize: 12, fontWeight: '700' }, strongValue: { fontSize: 14, fontWeight: '900' }, divider: { height: StyleSheet.hairlineWidth, marginTop: 13 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }, count: { fontSize: 11, fontWeight: '700' },
  testRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }, testIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, testCopy: { flex: 1 }, testName: { fontSize: 12, fontWeight: '700', lineHeight: 17 }, testStatus: { fontSize: 10, marginTop: 3 }, testAmount: { fontSize: 11, fontWeight: '800' }, emptyTests: { fontSize: 12, marginTop: 10 }, notes: { fontSize: 12, lineHeight: 18, marginTop: 8 }, missingState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 }, missingTitle: { fontSize: 18, fontWeight: '800' }, missingCopy: { marginTop: 8, textAlign: 'center', fontSize: 12, lineHeight: 18 },
});
