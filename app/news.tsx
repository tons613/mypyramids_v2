import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NewsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.lavender }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 100 }]}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={22} color={colors.navy} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text variant="headlineSmall" style={[styles.title, { color: colors.navy }]}>News & Updates</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>The latest from Pyramids Diagnostics</Text>
          </View>
        </View>

        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.artwork}>
            <View style={styles.paper}><Ionicons name="newspaper-outline" size={34} color="#F36C3D" /></View>
            <View style={styles.bell}><Ionicons name="notifications" size={22} color="#FFFFFF" /></View>
            <View style={styles.sparkOne} />
            <View style={styles.sparkTwo} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.navy }]}>You’re all caught up</Text>
          <Text style={[styles.emptyCopy, { color: colors.muted }]}>Service announcements, new offerings, and helpful health guidance will appear here.</Text>
          <Pressable onPress={() => router.replace('/(tabs)')} style={[styles.homeButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.homeButtonText}>Back to home</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  headerCopy: { flex: 1 },
  title: { fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 4 },
  emptyCard: { flex: 1, minHeight: 410, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginTop: 12, padding: 26, borderRadius: 26, borderWidth: 1 },
  artwork: { width: 150, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF3E8', marginBottom: 24 },
  paper: { width: 78, height: 90, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', transform: [{ rotate: '-7deg' }], elevation: 2 },
  bell: { position: 'absolute', right: 22, top: 20, width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5A03E' },
  sparkOne: { position: 'absolute', left: 22, top: 29, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F9C782' },
  sparkTwo: { position: 'absolute', right: 20, bottom: 25, width: 10, height: 10, borderRadius: 5, backgroundColor: '#E9B9FC' },
  emptyTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  emptyCopy: { maxWidth: 280, textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 8 },
  homeButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 23, paddingHorizontal: 18, marginTop: 20 },
  homeButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
