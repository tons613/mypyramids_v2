import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const supportOptions = [
  {
    icon: 'mail-outline' as const,
    title: 'Email our support team',
    description: 'support@pyramidsdiagnostics.com',
    url: 'mailto:support@pyramidsdiagnostics.com?subject=Pyramids%20app%20support',
  },
  {
    icon: 'document-text-outline' as const,
    title: 'Read the documentation',
    description: 'Guides and answers to common questions',
    url: 'https://docs.pyramidsdiagnostics.com',
  },
  {
    icon: 'pulse-outline' as const,
    title: 'Check service status',
    description: 'See whether our services are running normally',
    url: 'https://status.pyramidsdiagnostics.com',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open link', 'Please try again or contact support@pyramidsdiagnostics.com.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.lavender }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={22} color={colors.navy} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text variant="headlineSmall" style={[styles.title, { color: colors.navy }]}>Need help?</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>We’re here to help you get the care you need.</Text>
          </View>
        </View>

        <View style={[styles.introCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.introIcon, { backgroundColor: colors.accent }]}>
            <Ionicons name="headset-outline" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.introTitle, { color: colors.navy }]}>How can we help?</Text>
          <Text style={[styles.introCopy, { color: colors.muted }]}>Choose a support option below and our team will point you in the right direction.</Text>
        </View>

        <View style={styles.options}>
          {supportOptions.map((option) => (
            <Pressable
              key={option.title}
              accessibilityRole="link"
              onPress={() => void openLink(option.url)}
              style={({ pressed }) => [styles.option, pressed && styles.pressed, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.accent }]}><Ionicons name={option.icon} size={20} color={colors.primary} /></View>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, { color: colors.navy }]}>{option.title}</Text>
                <Text style={[styles.optionDescription, { color: colors.muted }]}>{option.description}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  headerCopy: { flex: 1 },
  title: { fontWeight: '800' },
  subtitle: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  introCard: { alignItems: 'center', marginHorizontal: 20, marginTop: 12, borderRadius: 24, borderWidth: 1, paddingHorizontal: 24, paddingVertical: 28 },
  introIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  introTitle: { fontSize: 18, fontWeight: '800' },
  introCopy: { maxWidth: 270, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 7 },
  options: { paddingHorizontal: 20, paddingTop: 22, gap: 11 },
  option: { minHeight: 76, borderWidth: 1, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  optionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1 },
  optionTitle: { fontSize: 13, fontWeight: '800' },
  optionDescription: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  pressed: { opacity: 0.75 },
});
