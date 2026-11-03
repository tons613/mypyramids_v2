import { CategoryGlyph } from '@/components/ui/categoryIcon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getApiErrorMessage } from '@/services/apiResponse';
import { testService } from '@/services/endpoints';
import { AppDispatch, RootState } from '@/store';
import { addToCart } from '@/store/cartSlice';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

type DiagnosticTest = {
  id: number | string;
  testname: string;
  private_price?: number | string;
  price?: number | string;
  description?: string | null;
  category?: { testcategory?: string } | string | null;
};

function readTest(payload: any): DiagnosticTest | null {
  const test = payload?.data ?? payload;
  return test && test.id !== undefined && typeof test.testname === 'string' ? test as DiagnosticTest : null;
}

type DescriptionBlock = { label?: string; value: string; separator?: string };

function formatDescription(description?: string | null): DescriptionBlock[] {
  const raw = description?.trim();
  if (!raw) return [{ value: 'No additional information is available for this test.' }];

  return raw
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap((paragraph) => paragraph.split('\n').map((line) => line.trim()).filter(Boolean))
    .map((line) => {
      const labeledField = line.match(/^(Sample required|Preparation|Note):\s*(.*)$/i);
      const turnaround = line.match(/^(Results are usually ready within)\s*:?[ \t]*(.*)$/i);
      const match = labeledField ?? turnaround;
      if (!match) return { value: line };
      return {
        label: match[1].replace(/^./, (letter) => letter.toUpperCase()),
        value: match[2],
        separator: labeledField ? ': ' : ' ',
      };
    });
}

export default function TestDetailScreen() {
  const params = useLocalSearchParams<{ testId?: string; categoryName?: string }>();
  const testId = Array.isArray(params.testId) ? params.testId[0] : params.testId;
  const categoryParam = Array.isArray(params.categoryName) ? params.categoryName[0] : params.categoryName;
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const [test, setTest] = useState<DiagnosticTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTest = useCallback(async () => {
    if (!testId) {
      setError('A test was not selected. Return to the test list and try again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = await testService.getTest(testId);
      const result = readTest(payload);
      if (!result) throw new Error('The test details response was incomplete.');
      setTest(result);
    } catch (err) {
      setError(getApiErrorMessage(err, 'We could not load this test. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => { void loadTest(); }, [loadTest]);

  const categoryName = typeof test?.category === 'string'
    ? test.category
    : test?.category?.testcategory || categoryParam || 'Diagnostic test';
  const alreadyAdded = test ? cartItems.some((item) => String(item.id) === String(test.id)) : false;
  const price = Number(test?.private_price ?? test?.price ?? 0);
  const descriptionBlocks = formatDescription(test?.description);

  const addTest = () => {
    if (!test || alreadyAdded) return;
    dispatch(addToCart({
      id: String(test.id),
      name: test.testname,
      price: Number.isFinite(price) ? price : 0,
      type: 'test',
      quantity: 1,
    }));
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F8FAFC' }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back to tests" onPress={() => router.back()} style={[styles.backButton, { borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={20} color={colors.navy} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>Test details</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open cart, ${cartItems.length} items`} onPress={() => router.push('/order/cart')} style={styles.cartButton}>
          <Ionicons name="cart-outline" size={23} color={colors.primary} />
          {cartItems.length > 0 ? <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}><Text style={styles.cartBadgeText}>{cartItems.length}</Text></View> : null}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.description, { color: colors.muted }]}>Loading test details…</Text>
        </View>
      ) : error || !test ? (
        <View style={styles.state}>
          <Text style={[styles.invalidTitle, { color: colors.navy }]}>Test details unavailable</Text>
          <Text style={[styles.description, { color: colors.muted }]}>{error || 'Return to the test list and choose a test again.'}</Text>
          <View style={styles.errorActions}>
            <Pressable onPress={() => void loadTest()} style={[styles.backToListButton, { backgroundColor: colors.primary }]}><Text style={styles.buttonText}>Try again</Text></Pressable>
            <Pressable onPress={() => router.back()} style={[styles.outlineButton, { borderColor: colors.border }]}><Text style={[styles.outlineButtonText, { color: colors.primary }]}>Back to tests</Text></Pressable>
          </View>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.identityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CategoryGlyph label={categoryName} size={34} />
              <View style={styles.identityCopy}>
                <Text style={[styles.categoryLabel, { color: colors.primary }]}>{categoryName}</Text>
                <Text style={[styles.testName, { color: colors.navy }]}>{test.testname}</Text>
              </View>
            </View>

            <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>Test price</Text>
              <Text style={[styles.price, { color: colors.navy }]}>
                {Number.isFinite(price) && price > 0 ? `₦${price.toLocaleString('en-NG')}` : 'Price unavailable'}
              </Text>
            </View>

            <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.descriptionTitle, { color: colors.navy }]}>About this test</Text>
              <View style={styles.descriptionBlocks}>
                {descriptionBlocks.map((block, index) => (
                  <Text key={`${index}-${block.label ?? 'paragraph'}`} style={[styles.description, { color: colors.muted }]}>
                    {block.label ? <Text style={[styles.descriptionLabel, { color: colors.navy }]}>{block.label}{block.separator}</Text> : null}
                    {block.value}
                  </Text>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
            <View style={styles.footerPrice}>
              <Text style={[styles.footerLabel, { color: colors.muted }]}>Total</Text>
              <Text style={[styles.footerAmount, { color: colors.navy }]}>
                {Number.isFinite(price) && price > 0 ? `₦${price.toLocaleString('en-NG')}` : '—'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: alreadyAdded }}
              onPress={addTest}
              disabled={alreadyAdded}
              style={[styles.addButton, { backgroundColor: alreadyAdded ? colors.accent : colors.primary }]}
            >
              <Ionicons name={alreadyAdded ? 'checkmark' : 'cart-outline'} size={18} color={alreadyAdded ? colors.primary : '#FFFFFF'} />
              <Text style={[styles.buttonText, alreadyAdded && { color: colors.primary }]}>{alreadyAdded ? 'Added to cart' : 'Add to cart'}</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  backButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  cartButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', right: 0, top: 0, minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  cartBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  content: { padding: 18, gap: 13 },
  identityCard: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 17, borderRadius: 20, borderWidth: 1 },
  identityCopy: { flex: 1 },
  categoryLabel: { fontSize: 12, fontWeight: '700', marginBottom: 5 },
  testName: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  priceCard: { padding: 17, borderRadius: 18, borderWidth: 1 },
  sectionLabel: { fontSize: 12 },
  price: { fontSize: 24, fontWeight: '800', marginTop: 5 },
  descriptionCard: { padding: 17, borderRadius: 18, borderWidth: 1 },
  descriptionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  description: { fontSize: 13, lineHeight: 20 },
  descriptionLabel: { fontWeight: '700' },
  descriptionBlocks: { gap: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1 },
  footerPrice: { flex: 1, minWidth: 0 },
  footerLabel: { fontSize: 11 },
  footerAmount: { fontSize: 17, fontWeight: '800', marginTop: 3, flexShrink: 1 },
  addButton: { minHeight: 46, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 13, borderRadius: 13 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', flexShrink: 1 },
  state: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25, gap: 10 },
  invalidTitle: { fontSize: 18, fontWeight: '800' },
  errorActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  backToListButton: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  outlineButton: { paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderRadius: 12 },
  outlineButtonText: { fontSize: 13, fontWeight: '700' },
});
