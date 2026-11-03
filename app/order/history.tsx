import { LoginRequiredGate } from '@/components/ui/LoginRequiredGate';
import { naira } from '@/constants/format';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getApiErrorMessage } from '@/services/apiResponse';
import { orderService } from '@/services/endpoints';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

type OrderLine = { id?: number; test_id?: number; testname?: string | { testname?: string }; amount?: number | string; status?: number; report_file?: string | null };
type Order = {
  request_id?: number;
  id?: number;
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

type OrderPage = { items: Order[]; total?: number; page?: number; size?: number };

function finiteNumber(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeOrderPage(payload: unknown): OrderPage {
  if (Array.isArray(payload)) return { items: payload as Order[] };
  if (!payload || typeof payload !== 'object') return { items: [] };
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.items)) {
    return {
      items: record.items as Order[],
      total: finiteNumber(record.total),
      page: finiteNumber(record.page),
      size: finiteNumber(record.size),
    };
  }
  if (Array.isArray(record.orders)) return { items: record.orders as Order[] };
  if (record.data !== undefined) return normalizeOrderPage(record.data);
  return { items: [] };
}

const PAGE_SIZE = 20;

function orderStatus(value: Order['status']) {
  const status = Number(value);
  if (status === 0) return 'Pending';
  if (status === 1) return 'Accepted';
  if (status === 2) return 'In progress';
  return typeof value === 'string' && value ? value : 'Status unavailable';
}

function formatDate(value?: string | null) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function testName(line: OrderLine) {
  return typeof line.testname === 'string' ? line.testname : line.testname?.testname || 'Diagnostic test';
}

function OrderHistoryContent() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [paginationError, setPaginationError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const loadingMoreRef = useRef(false);

  const loadOrders = useCallback(async (requestedPage = 1, append = false) => {
    if (append && loadingMoreRef.current) return;
    if (append) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      setPaginationError('');
    }
    try {
      const response = await orderService.getOrderHistory(requestedPage, PAGE_SIZE);
      const result = normalizeOrderPage(response);
      const incoming = result.items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setOrders((current) => {
        if (!append) return incoming;
        const seen = new Set(current.map((order, index) => String(order.request_id ?? order.id ?? order.order_reference ?? `row-${index}`)));
        return [...current, ...incoming.filter((order, index) => !seen.has(String(order.request_id ?? order.id ?? order.order_reference ?? `page-${requestedPage}-${index}`)))];
      });
      const currentPage = result.page ?? requestedPage;
      const pageSize = result.size ?? PAGE_SIZE;
      setPage(currentPage);
      setTotal(result.total);
      setHasMore(result.total !== undefined
        ? currentPage * pageSize < result.total
        : incoming.length >= pageSize);
      setError('');
    } catch (loadError) {
      const message = getApiErrorMessage(loadError, 'Could not load your order history.');
      if (append) setPaginationError(message);
      else setError(message);
    } finally {
      if (append) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadOrders(1).finally(() => setLoading(false));
  }, [loadOrders]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setPaginationError('');
    try { await loadOrders(1); } finally { setRefreshing(false); }
  }, [loadOrders]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F8FAFC' }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={[styles.backButton, { borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={21} color={colors.navy} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.navy }]}>Order history</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{total !== undefined ? `${total} ${total === 1 ? 'order' : 'orders'}` : orders.length ? `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}` : 'Your diagnostic orders'}</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.accent }]}><Ionicons name="receipt-outline" size={19} color={colors.primary} /></View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.stateCopy, { color: colors.muted }]}>Loading orders…</Text></View>
      ) : error && orders.length === 0 ? (
        <View style={styles.centerState}>
          <View style={[styles.stateIcon, { backgroundColor: colors.peach }]}><Ionicons name="cloud-offline-outline" size={27} color={colors.warning} /></View>
          <Text style={[styles.emptyTitle, { color: colors.navy }]}>Couldn’t load your orders</Text>
          <Text style={[styles.stateCopy, { color: colors.muted }]}>{error}</Text>
          <Pressable onPress={() => { setLoading(true); void loadOrders(1).finally(() => setLoading(false)); }} style={[styles.actionButton, { backgroundColor: colors.primary }]}><Text style={styles.actionText}>Try again</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, index) => String(item.request_id ?? item.id ?? item.order_reference ?? index)}
          contentContainerStyle={[styles.list, orders.length === 0 && styles.emptyList]}
          showsVerticalScrollIndicator={false}
          onEndReached={() => { if (hasMore && !loadingMore) void loadOrders(page + 1, true); }}
          onEndReachedThreshold={0.45}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
          renderItem={({ item }) => {
            const lines = Array.isArray(item.order_list) ? item.order_list : [];
            const summary = lines.slice(0, 2).map(testName).join(', ');
            const extraCount = Math.max(0, lines.length - 2);
            const status = orderStatus(item.status);
            const accepted = Number(item.status) > 0;
            return (
              <Pressable accessibilityRole="button" accessibilityLabel={`Order ${item.order_reference || item.request_id}, ${status}`} onPress={() => router.push({ pathname: '/order/history-detail', params: { order: JSON.stringify(item) } })} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.orderTop}>
                  <View style={[styles.orderIcon, { backgroundColor: colors.accent }]}><Ionicons name="flask-outline" size={20} color={colors.primary} /></View>
                  <View style={styles.orderHeading}>
                    <Text numberOfLines={1} style={[styles.reference, { color: colors.navy }]}>{item.order_reference || `Order #${item.request_id ?? item.id ?? ''}`}</Text>
                    <Text style={[styles.date, { color: colors.muted }]}>{formatDate(item.created_at)}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: accepted ? colors.accent : colors.lavender }]}><Text style={[styles.statusText, { color: accepted ? colors.primary : colors.muted }]}>{status}</Text></View>
                </View>
                <Text numberOfLines={2} style={[styles.tests, { color: colors.muted }]}>{summary || 'No test details available'}{extraCount ? `  +${extraCount} more` : ''}</Text>
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <View><Text style={[styles.amountLabel, { color: colors.muted }]}>Order total</Text><Text style={[styles.amount, { color: colors.navy }]}>{naira(item.netamount)}</Text></View>
                  <View style={styles.detailsLink}><Text style={[styles.detailsText, { color: colors.primary }]}>View details</Text><Ionicons name="chevron-forward" size={16} color={colors.primary} /></View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={(
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.stateIcon, { backgroundColor: colors.accent }]}><Ionicons name="receipt-outline" size={27} color={colors.primary} /></View>
              <Text style={[styles.emptyTitle, { color: colors.navy }]}>No orders yet</Text>
              <Text style={[styles.stateCopy, { color: colors.muted }]}>Your previous test orders will appear here.</Text>
              <Pressable onPress={() => router.push('/order')} style={[styles.actionButton, { backgroundColor: colors.primary }]}><Text style={styles.actionText}>Browse tests</Text><Ionicons name="arrow-forward" size={16} color="#FFFFFF" /></Pressable>
            </View>
          )}
          ListFooterComponent={loadingMore ? (
            <View style={styles.listFooter}><ActivityIndicator size="small" color={colors.primary} /></View>
          ) : paginationError ? (
            <Pressable accessibilityRole="button" onPress={() => void loadOrders(page + 1, true)} style={styles.listFooter}>
              <Text style={[styles.footerError, { color: colors.primary }]}>Couldn’t load more orders. Tap to retry.</Text>
            </Pressable>
          ) : undefined}
        />
      )}
    </SafeAreaView>
  );
}

export default function OrderHistoryScreen() { return <LoginRequiredGate><OrderHistoryContent /></LoginRequiredGate>; }

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1 }, title: { fontSize: 19, fontWeight: '800' }, subtitle: { fontSize: 11, marginTop: 3 }, headerIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 28, gap: 11 }, emptyList: { flexGrow: 1, justifyContent: 'center' }, orderCard: { borderWidth: 1, borderRadius: 18, padding: 14 }, orderTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, orderIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, orderHeading: { flex: 1 }, reference: { fontSize: 13, fontWeight: '800' }, date: { fontSize: 10, marginTop: 4 }, statusPill: { borderRadius: 11, paddingHorizontal: 9, paddingVertical: 5 }, statusText: { fontSize: 10, fontWeight: '800' },
  listFooter: { minHeight: 48, alignItems: 'center', justifyContent: 'center' }, footerError: { fontSize: 11, fontWeight: '700' },
  tests: { fontSize: 11, lineHeight: 16, marginTop: 12, marginBottom: 11 }, cardFooter: { minHeight: 44, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, amountLabel: { fontSize: 9 }, amount: { fontSize: 14, fontWeight: '900', marginTop: 2 }, detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 3 }, detailsText: { fontSize: 11, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }, centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }, stateIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, emptyCard: { alignItems: 'center', borderWidth: 1, borderRadius: 21, padding: 24 }, emptyTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' }, stateCopy: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 }, actionButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 17, marginTop: 18 }, actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
