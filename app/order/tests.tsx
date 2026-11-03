import { CategoryGlyph } from '@/components/ui/categoryIcon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getApiErrorMessage } from '@/services/apiResponse';
import { testService } from '@/services/endpoints';
import { AppDispatch, RootState } from '@/store';
import { addToCart } from '@/store/cartSlice';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

type DiagnosticTest = {
  id: number | string;
  testname: string;
  private_price?: number | string;
  price?: number | string;
  testcategory_id?: number | string;
  description?: string | null;
  category?: { id?: number | string; testcategory?: string } | string | null;
};

function readTestPage(payload: any) {
  const data = payload?.data ?? payload;
  const tests = Array.isArray(data) ? data : Array.isArray(data?.tests) ? data.tests : Array.isArray(data?.items) ? data.items : [];
  const paging = data?.paging ?? payload?.paging;
  return { tests: tests as DiagnosticTest[], hasMore: paging?.stop === false };
}

function getCategoryName(test: DiagnosticTest, fallback: string) {
  if (typeof test.category === 'string') return test.category;
  return test.category?.testcategory || fallback;
}

function formatPrice(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₦${amount.toLocaleString('en-NG')}` : 'Price unavailable';
}

export default function TestListScreen() {
  const params = useLocalSearchParams<{ categoryId?: string; categoryName?: string }>();
  const categoryId = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId ?? '';
  const categoryName = Array.isArray(params.categoryName) ? params.categoryName[0] : params.categoryName ?? 'Diagnostic tests';
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [query, setQuery] = useState('');
  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const loadingMoreRef = useRef(false);
  const cartIds = useMemo(() => new Set(cartItems.map((item) => String(item.id))), [cartItems]);

  const loadTests = useCallback(async (pageNumber = 1, append = false) => {
    if (append) {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError('');
    }

    try {
      const payload = await testService.getTests(categoryId, pageNumber, 10);
      const result = readTestPage(payload);
      setTests((current) => append ? [...current, ...result.tests] : result.tests);
      setHasMore(result.hasMore);
      setPage(pageNumber);
    } catch (err) {
      const message = getApiErrorMessage(err, 'We could not load tests for this category. Please try again.');
      if (!append) setError(message);
      else Alert.alert('Could not load more tests', message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [categoryId]);

  useEffect(() => {
    setTests([]);
    setPage(1);
    setHasMore(false);
    void loadTests(1);
  }, [loadTests]);

  const filteredTests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tests.filter((test) => test.testname?.toLowerCase().includes(normalizedQuery));
  }, [tests, query]);

  const addTest = (test: DiagnosticTest) => {
    const id = String(test.id);
    if (cartIds.has(id)) return;
    const price = Number(test.private_price ?? test.price ?? 0);
    dispatch(addToCart({ id, name: test.testname, price: Number.isFinite(price) ? price : 0, type: 'test', quantity: 1 }));
  };

  const openDetails = (test: DiagnosticTest) => router.push({
    pathname: '/order/test-detail',
    params: { testId: String(test.id), categoryName },
  });

  const renderTest = ({ item }: { item: DiagnosticTest }) => {
    const alreadyAdded = cartIds.has(String(item.id));
    const category = getCategoryName(item, categoryName);
    return (
      <View style={[styles.testCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.testHeading}>
          <CategoryGlyph label={category} size={26} />
          <View style={styles.testCopy}>
            <Text style={[styles.testName, { color: colors.navy }]}>{item.testname}</Text>
            <Text style={[styles.testCategory, { color: colors.primary }]}>{category}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`View details for ${item.testname}`} onPress={() => openDetails(item)} style={styles.detailIconButton}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>
        {/* {item.description ? <Text numberOfLines={2} style={[styles.testDescription, { color: colors.muted }]}>{item.description}</Text> : null} */}
        <View style={[styles.testDivider, { backgroundColor: colors.border }]} />
        <View style={styles.testFooter}>
          <Text style={[styles.testPrice, { color: colors.navy }]}>{formatPrice(item.private_price ?? item.price)}</Text>
          <View style={styles.testActions}>
            <Pressable onPress={() => openDetails(item)} style={[styles.detailsButton, { borderColor: colors.border }]}>
              <Text style={[styles.detailsButtonText, { color: colors.primary }]}>Details</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: alreadyAdded }}
              onPress={() => addTest(item)}
              disabled={alreadyAdded}
              style={[styles.addButton, { backgroundColor: alreadyAdded ? colors.accent : colors.primary }]}
            >
              <Ionicons name={alreadyAdded ? 'checkmark' : 'cart-outline'} size={16} color={alreadyAdded ? colors.primary : '#FFFFFF'} />
              <Text style={[styles.addButtonText, alreadyAdded && { color: colors.primary }]}>{alreadyAdded ? 'Added' : 'Add to cart'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F8FAFC' }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back to categories" onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={20} color={colors.navy} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.navy }]}>{categoryName}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>Choose a test to add to your cart</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open cart, ${cartItems.length} items`} onPress={() => router.push('/order/cart')} style={styles.cartButton}>
          <Ionicons name="cart-outline" size={23} color={colors.primary} />
          {cartItems.length > 0 ? <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}><Text style={styles.cartBadgeText}>{cartItems.length}</Text></View> : null}
        </Pressable>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search tests"
          placeholder="Search tests in this category"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          style={[styles.searchInput, { color: colors.navy }]}
          returnKeyType="search"
        />
        {query ? <Pressable onPress={() => setQuery('')}><Ionicons name="close-circle" size={19} color={colors.muted} /></Pressable> : null}
      </View>

      {loading ? (
        <View style={styles.centerState}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.stateText, { color: colors.muted }]}>Loading tests…</Text></View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateTitle, { color: colors.navy }]}>Tests unavailable</Text>
          <Text style={[styles.stateText, { color: colors.muted }]}>{error}</Text>
          <Pressable onPress={() => void loadTests(1)} style={[styles.retryButton, { backgroundColor: colors.primary }]}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredTests}
          renderItem={renderTest}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.testList, filteredTests.length === 0 && styles.emptyList]}
          showsVerticalScrollIndicator={false}
          onEndReached={() => { if (hasMore && !loadingMore && !query) void loadTests(page + 1, true); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={[styles.stateText, { color: colors.muted }]}>{query ? 'No tests match your search.' : 'There are no tests in this category yet.'}</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerLoader} color={colors.primary} /> : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10 },
  backButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, marginHorizontal: 12 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSubtitle: { marginTop: 3, fontSize: 11 },
  cartButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', right: 0, top: 0, minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  cartBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  searchBox: { height: 49, flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 18, marginTop: 14, marginBottom: 6, paddingHorizontal: 14, borderWidth: 1, borderRadius: 15 },
  searchInput: { flex: 1, height: '100%', fontSize: 13 },
  testList: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28, gap: 11 },
  testCard: { padding: 14, borderRadius: 18, borderWidth: 1 },
  testHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  testCopy: { flex: 1 },
  testName: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  testCategory: { marginTop: 3, fontSize: 11, fontWeight: '600' },
  detailIconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  testDescription: { fontSize: 11, lineHeight: 16, marginTop: 10, marginLeft: 60 },
  testDivider: { height: StyleSheet.hairlineWidth, marginTop: 12, marginBottom: 11 },
  testFooter: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  testPrice: { fontSize: 15, fontWeight: '800' },
  testActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  detailsButton: { minHeight: 34, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10 },
  detailsButtonText: { fontSize: 11, fontWeight: '700' },
  addButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 11, borderRadius: 10 },
  addButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  stateTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  stateText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryButton: { marginTop: 7, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  footerLoader: { marginVertical: 16 },
});
