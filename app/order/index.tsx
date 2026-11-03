import { CategoryGlyph } from '@/components/ui/categoryIcon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getApiErrorMessage } from '@/services/apiResponse';
import { testService } from '@/services/endpoints';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type TestCategory = { id: number | string; testcategory: string };

function readCategories(payload: any): TestCategory[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.categories)) return payload.data.categories;
  return [];
}

function getCategoryType(category: TestCategory) {
  const name = category.testcategory.toLowerCase();
  const radiologyIds = ['1', '2', '9', '12'];
  return radiologyIds.includes(String(category.id)) || /x.?ray|ultra|scan|radiolog|mri|ct/.test(name)
    ? 'Radiology'
    : 'Laboratory';
}

export default function TestCategoriesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await testService.getCategories();
      setCategories(readCategories(response));
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'We could not load test categories. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCategories(); }, [loadCategories]);

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return categories.filter((category) => category.testcategory?.toLowerCase().includes(normalizedQuery));
  }, [categories, query]);

  const openCategory = (category: TestCategory) => router.push({
    pathname: '/order/tests',
    params: { categoryId: String(category.id), categoryName: category.testcategory },
  });

  const renderCategory = ({ item }: { item: TestCategory }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Browse ${item.testcategory} tests`}
      onPress={() => openCategory(item)}
      style={({ pressed }) => [
        viewMode === 'grid' ? styles.categoryGridCard : styles.categoryListCard,
        pressed && styles.pressed,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <CategoryGlyph label={item.testcategory} size={viewMode === 'grid' ? 30 : 25} />
      <View style={[styles.categoryCopy, viewMode === 'grid' ? styles.categoryGridCopy : styles.categoryListCopy]}>
        <Text numberOfLines={2} style={[styles.categoryName, { color: colors.navy }]}>{item.testcategory}</Text>
        <Text style={[styles.categoryType, { color: colors.primary }]}>{getCategoryType(item)}</Text>
      </View>
      {viewMode === 'list' ? <Ionicons name="chevron-forward" size={19} color={colors.primary} /> : null}
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F8FAFC' }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={20} color={colors.navy} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>Select Diagnostic Category</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search test categories"
          placeholder="Search categories"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          style={[styles.searchInput, { color: colors.navy }]}
          returnKeyType="search"
        />
        {query ? <Pressable onPress={() => setQuery('')}><Ionicons name="close-circle" size={19} color={colors.muted} /></Pressable> : null}
      </View>

      <View style={[styles.viewToggle, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['grid', 'list'] as const).map((mode) => {
          const active = viewMode === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${mode} view`}
              onPress={() => setViewMode(mode)}
              style={[styles.toggleOption, active && { borderBottomColor: colors.primary }]}
            >
              <Ionicons name={mode === 'grid' ? 'grid-outline' : 'list-outline'} size={21} color={active ? colors.primary : colors.muted} />
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerState}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.stateText, { color: colors.muted }]}>Loading categories…</Text></View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateTitle, { color: colors.navy }]}>Categories unavailable</Text>
          <Text style={[styles.stateText, { color: colors.muted }]}>{error}</Text>
          <Pressable onPress={() => void loadCategories()} style={[styles.retryButton, { backgroundColor: colors.primary }]}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : (
        <FlatList
          key={viewMode}
          data={filteredCategories}
          renderItem={renderCategory}
          keyExtractor={(item) => String(item.id)}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          contentContainerStyle={[styles.categoryList, { paddingBottom: Math.max(insets.bottom, 12) + 100 }, filteredCategories.length === 0 && styles.emptyList]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={[styles.stateText, { color: colors.muted }]}>No categories match your search.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', marginHorizontal: 10 },
  headerSpacer: { width: 38 },
  searchBox: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 18, marginTop: 16, paddingHorizontal: 14, borderWidth: 1, borderRadius: 15 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  viewToggle: { flexDirection: 'row', marginTop: 14, paddingHorizontal: 22, borderBottomWidth: 1 },
  toggleOption: { width: 70, height: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  categoryList: { paddingHorizontal: 16, paddingTop: 14 },
  gridRow: { gap: 12, marginBottom: 12 },
  categoryGridCard: { flex: 1, minHeight: 150, alignItems: 'center', justifyContent: 'center', padding: 13, borderRadius: 19, borderWidth: 1 },
  categoryListCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 17, borderWidth: 1 },
  categoryCopy: { flex: 1 },
  categoryGridCopy: { alignItems: 'center', marginTop: 9 },
  categoryListCopy: { alignItems: 'flex-start' },
  categoryName: { textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  categoryType: { marginTop: 5, fontSize: 11, fontWeight: '600' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  stateTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  stateText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryButton: { marginTop: 7, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
});
