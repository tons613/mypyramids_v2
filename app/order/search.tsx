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
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, type TextInputInstance, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

type DiagnosticTest = {
  id: number | string;
  testname: string;
  private_price?: number | string;
  price?: number | string;
  description?: string | null;
  category?: { id?: number | string; testcategory?: string } | string | null;
};

type TestSearchPage = {
  tests: DiagnosticTest[];
  paging?: { total?: number; nextcursor?: number; stop?: boolean };
};

function readSearchPage(payload: any): TestSearchPage {
  const data = payload?.data ?? payload;
  return {
    tests: Array.isArray(data?.tests) ? data.tests : [],
    paging: data?.paging,
  };
}

function getCategoryName(test: DiagnosticTest) {
  if (typeof test.category === 'string') return test.category;
  return test.category?.testcategory || 'Diagnostic test';
}

function formatPrice(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? `₦${amount.toLocaleString('en-NG')}`
    : 'Price unavailable';
}

export default function TestSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const initialQuery = Array.isArray(params.query) ? params.query[0] : params.query ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [searchTerm, setSearchTerm] = useState('');
  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [resultTotal, setResultTotal] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [nextPage, setNextPage] = useState(2);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const inputRef = useRef<TextInputInstance>(null);
  const cartIds = useMemo(() => new Set(cartItems.map((item) => String(item.id))), [cartItems]);

  useEffect(() => {
    const timeout = setTimeout(() => setSearchTerm(query.trim()), 350);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setTests([]);
    setResultTotal(0);
    setError('');
    setHasMore(false);
    setNextPage(2);

    if (!searchTerm) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void testService.searchTests(searchTerm, 1, 10)
      .then((payload) => {
        if (requestId !== requestIdRef.current) return;
        const result = readSearchPage(payload);
        setTests(result.tests);
        setResultTotal(result.paging?.total ?? result.tests.length);
        setHasMore(result.paging?.stop === false);
        setNextPage(result.paging?.nextcursor || 2);
      })
      .catch((reason) => {
        if (requestId === requestIdRef.current) {
          setError(getApiErrorMessage(reason, 'Search is unavailable right now. Please try again.'));
        }
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });

    return () => {
      if (requestId === requestIdRef.current) requestIdRef.current += 1;
    };
  }, [retryCount, searchTerm]);

  const loadMore = useCallback(async () => {
    if (!searchTerm || !hasMore || loadingMoreRef.current || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const requestId = requestIdRef.current;
    try {
      const payload = await testService.searchTests(searchTerm, nextPage, 10);
      if (requestId !== requestIdRef.current) return;
      const result = readSearchPage(payload);
      setTests((current) => [...current, ...result.tests]);
      setHasMore(result.paging?.stop === false);
      setNextPage(result.paging?.nextcursor || nextPage + 1);
    } catch (reason) {
      if (requestId === requestIdRef.current) {
        Alert.alert('Could not load more results', getApiErrorMessage(reason, 'Please try again.'));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [hasMore, loading, nextPage, searchTerm]);

  const addTest = (test: DiagnosticTest) => {
    const id = String(test.id);
    if (cartIds.has(id)) return;
    const price = Number(test.private_price ?? test.price ?? 0);
    dispatch(addToCart({
      id,
      name: test.testname,
      price: Number.isFinite(price) ? price : 0,
      type: 'test',
      quantity: 1,
    }));
  };

  const openDetails = (test: DiagnosticTest) => router.push({
    pathname: '/order/test-detail',
    params: { testId: String(test.id), categoryName: getCategoryName(test) },
  });

  const renderTest = ({ item }: { item: DiagnosticTest }) => {
    const alreadyAdded = cartIds.has(String(item.id));
    const category = getCategoryName(item);
    return (
      <View style={[styles.testCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.testHeading}>
          <CategoryGlyph label={category} size={27} />
          <View style={styles.testCopy}>
            <Text style={[styles.testName, { color: colors.navy }]}>{item.testname}</Text>
            <Text style={[styles.testCategory, { color: colors.primary }]}>{category}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`View details for ${item.testname}`} onPress={() => openDetails(item)} style={styles.detailIconButton}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.testFooter}>
          <Text style={[styles.testPrice, { color: colors.navy }]}>{formatPrice(item.private_price ?? item.price)}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => openDetails(item)} style={[styles.detailsButton, { borderColor: colors.border }]}>
              <Text style={[styles.detailsText, { color: colors.primary }]}>Details</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: alreadyAdded }}
              disabled={alreadyAdded}
              onPress={() => addTest(item)}
              style={[styles.addButton, { backgroundColor: alreadyAdded ? colors.accent : colors.primary }]}
            >
              <Ionicons name={alreadyAdded ? 'checkmark' : 'cart-outline'} size={15} color={alreadyAdded ? colors.primary : '#FFFFFF'} />
              <Text style={[styles.addText, alreadyAdded && { color: colors.primary }]}>{alreadyAdded ? 'Added' : 'Add to cart'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F8FAFC' }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.backButton, { borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={20} color={colors.navy} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>Search tests</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open cart, ${cartItems.length} items`} onPress={() => router.push('/order/cart')} style={styles.cartButton}>
          <Ionicons name="cart-outline" size={23} color={colors.primary} />
          {cartItems.length > 0 ? <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}><Text style={styles.cartBadgeText}>{cartItems.length}</Text></View> : null}
        </Pressable>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.primary} />
        <TextInput
          ref={inputRef}
          autoFocus
          accessibilityLabel="Search diagnostic tests"
          placeholder="Search tests by name or category"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          style={[styles.searchInput, { color: colors.navy }]}
          returnKeyType="search"
          onSubmitEditing={() => setSearchTerm(query.trim())}
        />
        {query.length > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setQuery(''); inputRef.current?.focus(); }}>
            <Ionicons name="close-circle" size={19} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centerState}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.stateText, { color: colors.muted }]}>Searching tests…</Text></View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateTitle, { color: colors.navy }]}>Search unavailable</Text>
          <Text style={[styles.stateText, { color: colors.muted }]}>{error}</Text>
          <Pressable onPress={() => setRetryCount((current) => current + 1)} style={[styles.retryButton, { backgroundColor: colors.primary }]}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : !searchTerm ? (
        <View style={styles.centerState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}><Ionicons name="search-outline" size={27} color={colors.primary} /></View>
          <Text style={[styles.stateTitle, { color: colors.navy }]}>Find a test</Text>
          <Text style={[styles.stateText, { color: colors.muted }]}>Search by test name, description, or diagnostic category.</Text>
        </View>
      ) : (
        <FlatList
          data={tests}
          renderItem={renderTest}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.resultsList, tests.length === 0 && styles.emptyList]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={tests.length > 0 ? <Text style={[styles.resultCount, { color: colors.muted }]}>{`${resultTotal.toLocaleString('en-NG')} ${resultTotal === 1 ? 'result' : 'results'}`}</Text> : undefined}
          ListEmptyComponent={<View style={styles.emptyResults}><Ionicons name="search-outline" size={28} color={colors.muted} /><Text style={[styles.stateTitle, { color: colors.navy }]}>No tests found</Text><Text style={[styles.stateText, { color: colors.muted }]}>Try another test name or category.</Text></View>}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerLoader} color={colors.primary} /> : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, marginLeft: 13, fontSize: 17, fontWeight: '800' },
  cartButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', right: 0, top: 0, minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  cartBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  searchBox: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 18, marginTop: 14, marginBottom: 5, paddingHorizontal: 14, borderWidth: 1, borderRadius: 16 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  resultsList: { paddingHorizontal: 16, paddingTop: 13, paddingBottom: 28, gap: 11 },
  resultCount: { marginBottom: 1, fontSize: 12, fontWeight: '600' },
  testCard: { padding: 14, borderRadius: 18, borderWidth: 1 },
  testHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  testCopy: { flex: 1 },
  testName: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  testCategory: { marginTop: 3, fontSize: 11, fontWeight: '600' },
  detailIconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 12, marginBottom: 11 },
  testFooter: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  testPrice: { fontSize: 15, fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  detailsButton: { minHeight: 34, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10 },
  detailsText: { fontSize: 11, fontWeight: '700' },
  addButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 11, borderRadius: 10 },
  addText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  stateTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  stateText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryButton: { marginTop: 7, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyList: { flexGrow: 1 },
  emptyResults: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9 },
  footerLoader: { marginVertical: 16 },
});
