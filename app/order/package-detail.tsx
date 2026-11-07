import { CategoryGlyph } from '@/components/ui/categoryIcon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getApiErrorMessage } from '@/services/apiResponse';
import { testService } from '@/services/endpoints';
import { HealthPackage, readHealthPackages } from '@/services/healthPackages';
import { AppDispatch, RootState } from '@/store';
import { addToCart } from '@/store/cartSlice';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

export default function PackageDetailScreen() {
  const params = useLocalSearchParams<{ packageId?: string }>();
  const packageId = Array.isArray(params.packageId) ? params.packageId[0] : params.packageId;
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const [pkg, setPackage] = useState<HealthPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = () => {
    setLoading(true);
    setError('');
    setImageError(false);
    setAttempt((value) => value + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const request = packageId?.trim()
      ? testService.getHealthPackages()
      : Promise.reject(new Error('A package was not selected. Return Home and choose a package.'));
    void request.then((payload) => {
      const packages = readHealthPackages(payload);
      const selected = packages.find((item) => String(item.id) === packageId);
      if (!selected) throw new Error('This package is no longer available. Return Home to choose another package.');
      if (!cancelled) setPackage(selected);
    }).catch((err: unknown) => {
      if (!cancelled) setError(getApiErrorMessage(err, 'We could not load this package. Please try again.'));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [packageId, attempt]);

  const alreadyAdded = pkg ? cartItems.some((item) => item.type === 'package' && item.id === `package:${pkg.id}`) : false;
  const canAdd = pkg?.price !== null && !!pkg && !alreadyAdded;
  const priceLabel = pkg?.price != null ? `₦${pkg.price.toLocaleString('en-NG')}` : 'Price unavailable';
  const addPackage = () => {
    if (!pkg || pkg.price === null || alreadyAdded) return;
    dispatch(addToCart({
      id: `package:${pkg.id}`,
      name: pkg.name,
      price: pkg.price,
      type: 'package',
      quantity: 1,
    }));
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to health packages" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={[styles.iconButton, { borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={20} color={colors.navy} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>Package details</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open cart, ${cartItems.length} items`} onPress={() => router.push('/order/cart')} style={styles.iconButton}>
          <Ionicons name="cart-outline" size={23} color={colors.primary} />
          {cartItems.length ? <View style={[styles.badge, { backgroundColor: colors.primary }]}><Text style={styles.badgeText}>{cartItems.length}</Text></View> : null}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.body, { color: colors.muted }]}>Loading package details…</Text>
        </View>
      ) : error || !pkg ? (
        <View style={styles.state}>
          <Text style={[styles.title, { color: colors.navy }]}>Package unavailable</Text>
          <Text accessibilityRole="alert" style={[styles.body, { color: colors.muted }]}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={retry} style={[styles.button, { backgroundColor: colors.primary }]}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {pkg.image && !imageError ? (
              <Image source={{ uri: pkg.image }} resizeMode="cover" style={[styles.image, { backgroundColor: colors.accent }]} accessibilityLabel={pkg.name} onError={() => setImageError(true)} />
            ) : null}
            {imageError ? <Text style={[styles.body, { color: colors.muted }]}>Package image could not be loaded.</Text> : null}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>HEALTH PACKAGE</Text>
              <Text style={[styles.title, { color: colors.navy }]}>{pkg.name}</Text>
              {pkg.subheading ? <Text style={[styles.body, { color: colors.muted }]}>{pkg.subheading}</Text> : null}
              <Text style={[styles.price, { color: colors.primary }]}>{priceLabel}</Text>
              <Text style={[styles.body, { color: colors.muted }]}>{pkg.test_count} {pkg.test_count === 1 ? 'test' : 'tests'} included</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.navy }]}>About this package</Text>
              <Text style={[styles.body, { color: colors.muted }]}>{pkg.description || 'No additional description is available for this package.'}</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.navy }]}>Included tests</Text>
              {pkg.tests.length ? pkg.tests.map((test, index) => {
                const category = typeof test.category === 'string' ? test.category : test.category?.testcategory || 'Diagnostic test';
                return (
                  <Pressable
                    key={`${test.id}-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${test.testname} details`}
                    onPress={() => router.push({ pathname: '/order/test-detail', params: { testId: String(test.id) } })}
                    style={[styles.testRow, { borderColor: colors.border }]}
                  >
                    <CategoryGlyph label={category} size={24} />
                    <View style={styles.testCopy}>
                      <Text style={[styles.testName, { color: colors.navy }]}>{test.testname}</Text>
                      <Text style={[styles.body, { color: colors.muted }]}>{category}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                  </Pressable>
                );
              }) : <Text style={[styles.body, { color: colors.muted }]}>The included test list is not available yet.</Text>}
            </View>
            <View style={[styles.notice, { backgroundColor: colors.accent }]}>
              <Ionicons name="information-circle-outline" size={21} color={colors.primary} />
              <Text style={[styles.noticeText, { color: colors.navy }]}>You can save this package in your cart. Package payment is not available yet; checkout currently supports individual tests only.</Text>
            </View>
            {pkg.price === null ? <Text accessibilityRole="alert" style={[styles.body, { color: colors.muted }]}>This package cannot be added until its price is available.</Text> : null}
          </ScrollView>
          <View style={[styles.footer, (width < 360 || fontScale > 1.3) && styles.stackedFooter, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
            <View style={styles.testCopy}>
              <Text style={[styles.body, { color: colors.muted }]}>Package total</Text>
              <Text style={[styles.footerAmount, { color: colors.navy }]}>{priceLabel}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canAdd }} disabled={!canAdd} onPress={addPackage} style={[styles.button, { backgroundColor: canAdd ? colors.primary : colors.accent }]}>
              <Ionicons name={alreadyAdded ? 'checkmark' : 'cart-outline'} size={18} color={canAdd ? '#FFFFFF' : colors.primary} />
              <Text style={[styles.buttonText, !canAdd && { color: colors.primary }]}>{alreadyAdded ? 'Added to cart' : 'Add to cart'}</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 62, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800' },
  iconButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: 0, top: 0, minWidth: 18, borderRadius: 9, paddingHorizontal: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  content: { padding: 18, gap: 14 },
  image: { width: '100%', height: 170, borderRadius: 20 },
  card: { padding: 18, gap: 9, borderRadius: 20, borderWidth: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 21, lineHeight: 28, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 20 },
  price: { fontSize: 25, fontWeight: '800', marginTop: 5 },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1 },
  testCopy: { flex: 1, minWidth: 0 },
  testName: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  notice: { flexDirection: 'row', gap: 9, padding: 14, borderRadius: 16 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 20 },
  footer: { paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  stackedFooter: { flexDirection: 'column', alignItems: 'stretch' },
  footerAmount: { fontSize: 18, fontWeight: '800' },
  button: { minHeight: 46, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
});
