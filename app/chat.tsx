import { LoginRequiredGate } from '@/components/ui/LoginRequiredGate';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getApiErrorMessage } from '@/services/apiResponse';
import { clearChatMessages, loadChatMessages, saveChatMessages, type CachedChatMessage } from '@/services/chatCache';
import { aiService } from '@/services/endpoints';
import { RootState } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

type ChatMessage = {
  id: string;
  text: string;
  createdAt: Date;
  sender: 'doctor' | 'patient';
  recommendations?: string[];
};

type BackendChatMessage = {
  _id?: string | number;
  text?: unknown;
  createdAt?: unknown;
  user?: { _id?: string | number; name?: string };
};

const welcomeMessage = (firstName: string): ChatMessage => ({
  id: 'welcome',
  sender: 'doctor',
  createdAt: new Date(),
  text: `Hi ${firstName || 'there'}! 👋\nI’m Dr Toni, your virtual health assistant. Tell me what symptoms you’re experiencing and when they started, and I’ll suggest tests that may help your care team investigate.`,
});

function asDate(value: unknown): Date {
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const numeric = Number(value);
    return new Date(value.trim() && Number.isFinite(numeric) ? numeric : value);
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return new Date();
}

function normalizeHistory(payload: unknown): ChatMessage[] {
  let data = payload;
  if (data && typeof data === 'object' && 'data' in data) data = (data as { data: unknown }).data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    data = record.messages ?? record.items ?? record.history ?? [];
  }
  if (!Array.isArray(data)) return [];

  return data.map((raw, index) => {
    const record = raw as BackendChatMessage;
    const text = typeof record.text === 'string' ? record.text : '';
    const isDoctor = String(record.user?._id ?? '') === '1' || /dr\.?\s*toni/i.test(record.user?.name ?? '');
    const parsed = isDoctor ? parseRecommendation(text) : { text, tests: [] as string[] };
    return {
      id: String(record._id ?? `history-${index}`),
      text: parsed.text || text,
      createdAt: asDate(record.createdAt),
      sender: isDoctor ? 'doctor' as const : 'patient' as const,
      ...(parsed.tests.length ? { recommendations: parsed.tests } : {}),
    };
  }).filter((message) => Boolean(message.text.trim()));
}

function toCachedMessages(messages: ChatMessage[]): CachedChatMessage[] {
  return messages.map(({ id, text, createdAt, sender, recommendations }) => ({
    id,
    text,
    createdAt: createdAt.toISOString(),
    sender,
    ...(recommendations?.length ? { recommendations } : {}),
  }));
}

function fromCachedMessages(messages: CachedChatMessage[]): ChatMessage[] {
  return messages.map((message) => ({ ...message, createdAt: asDate(message.createdAt) }));
}

function isNetworkError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; response?: unknown; message?: string };
  return !candidate.response && (
    candidate.code === 'ERR_NETWORK' || candidate.code === 'ECONNABORTED' ||
    /network|offline|fetch|internet/i.test(candidate.message ?? '')
  );
}

function parseRecommendation(payload: unknown): { text: string; tests: string[] } {
  const body = payload && typeof payload === 'object' && 'data' in payload
    ? (payload as { data: unknown }).data
    : payload;
  let candidates: unknown = body;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    candidates = record.recommendation ?? record.recommendations ?? record.tests ?? record.result ?? record.message;
  }
  if (typeof candidates === 'string') {
    const lines = candidates.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const tests = lines
      .filter((line) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(line))
      .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
      .filter(Boolean);
    if (tests.length) {
      const explanation = lines
        .filter((line) => !/^\s*(?:[-*•]|\d+[.)])\s+/.test(line))
        .join('\n\n');
      return {
        text: explanation || 'Here are some tests to discuss with your clinician:',
        tests,
      };
    }
    return { text: candidates.trim(), tests: [] };
  }
  if (Array.isArray(candidates)) {
    const tests = candidates
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return String(record.testname ?? record.name ?? record.title ?? '').trim();
        }
        return '';
      })
      .filter(Boolean);
    return { text: 'Based on what you shared, these tests may help your care team investigate:', tests };
  }
  return { text: '', tests: [] };
}

function ChatContent() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.uid;
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage(user?.firstname?.trim() || 'there')]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [clearing, setClearing] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setCacheLoaded(false);
    setOnline(null);
    const welcome = welcomeMessage(user?.firstname?.trim() || 'there');

    const syncHistory = async () => {
      const cached = await loadChatMessages(userId);
      if (!active) return;
      setMessages(cached.length ? fromCachedMessages(cached) : [welcome]);
      setCacheLoaded(true);

      try {
        const history = normalizeHistory(await aiService.getChatHistory());
        if (!active) return;
        setOnline(true);
        const next = history.length ? history : [welcome];
        setMessages(next);
        await saveChatMessages(userId, toCachedMessages(next));
      } catch (error) {
        if (!active) return;
        setOnline(isNetworkError(error) ? false : true);
      }
    };

    void syncHistory();
    return () => { active = false; };
  }, [userId, user?.firstname]);

  useEffect(() => {
    if (userId && cacheLoaded) void saveChatMessages(userId, toCachedMessages(messages));
  }, [messages, userId, cacheLoaded]);

  useEffect(() => {
    if (messages.length) {
      const timeout = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      return () => clearTimeout(timeout);
    }
  }, [messages, sending]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (online === false) {
      Alert.alert('You’re offline', 'You’re offline. Please connect to the internet to chat with Dr Toni.');
      return;
    }
    const sentAt = new Date();
    setDraft('');
    setSending(true);
    setMessages((current) => [...current, {
      id: `patient-${Date.now()}`,
      sender: 'patient',
      createdAt: sentAt,
      text,
    }]);

    try {
      const response = await aiService.chatWithBot(text);
      const recommendation = parseRecommendation(response);
      setMessages((current) => [...current, {
        id: `doctor-${Date.now()}`,
        sender: 'doctor',
        createdAt: new Date(),
        text: recommendation.text || 'Thanks for sharing that. Could you tell me a little more about when it started and how it feels?',
        recommendations: recommendation.tests,
      }]);
    } catch (error) {
      if (isNetworkError(error)) setOnline(false);
      setMessages((current) => [...current, {
        id: `error-${Date.now()}`,
        sender: 'doctor',
        createdAt: new Date(),
        text: isNetworkError(error)
          ? 'You’re offline. Please connect to the internet to chat with Dr Toni.'
          : `I couldn’t get test suggestions just now. ${getApiErrorMessage(error, 'Please try again in a moment.')}`,
      }]);
    } finally {
      setSending(false);
    }
  };

  const confirmClearHistory = () => {
    if (clearing || !userId) return;
    Alert.alert('Clear chat history?', 'This will delete your conversation with Dr Toni.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear history',
        style: 'destructive',
        onPress: () => {
          setClearing(true);
          void (async () => {
            try {
              await aiService.clearChatHistory();
              await clearChatMessages(userId);
              setMessages([welcomeMessage(user?.firstname?.trim() || 'there')]);
            } catch (error) {
              Alert.alert('Could not clear chat', getApiErrorMessage(error, 'Please try again.'));
            } finally {
              setClearing(false);
            }
          })();
        },
      },
    ]);
  };

  const openSuggestedTest = (testName: string) => router.push({
    pathname: '/order/search',
    params: { query: testName },
  });

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const fromDoctor = item.sender === 'doctor';
    return (
      <View style={[styles.messageRow, !fromDoctor && styles.patientMessageRow]}>
        {fromDoctor ? (
          <View style={[styles.doctorAvatar, { backgroundColor: colors.accent }]}>
            <Ionicons name="medical" size={18} color={colors.primary} />
          </View>
        ) : null}
        <View style={[styles.messageContent, !fromDoctor && styles.patientMessageContent]}>
          {fromDoctor ? (
            <View style={[styles.doctorBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.messageText, { color: colors.navy }]}>{item.text}</Text>
              {item.recommendations?.map((test, index) => (
                <Pressable
                  key={`${item.id}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Search for ${test}`}
                  onPress={() => openSuggestedTest(test)}
                  style={[styles.recommendation, { backgroundColor: colors.lavender, borderColor: colors.border }]}
                >
                  <View style={[styles.recommendationIcon, { backgroundColor: colors.accent }]}>
                    <Ionicons name="flask-outline" size={16} color={colors.primary} />
                  </View>
                  <Text numberOfLines={2} style={[styles.recommendationText, { color: colors.navy }]}>{test}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </Pressable>
              ))}
            </View>
          ) : (
            <LinearGradient colors={['#6D28D9', '#7C3AED']} style={styles.patientBubble}>
              <Text style={styles.patientText}>{item.text}</Text>
            </LinearGradient>
          )}
          <Text style={[styles.messageTime, { color: colors.muted, textAlign: fromDoctor ? 'left' : 'right' }]}>
            {item.createdAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F8FAFC' }]}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={[styles.headerButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="arrow-back" size={21} color={colors.primary} />
          </Pressable>
          <View style={styles.headerTitle}>
            <Text style={[styles.title, { color: colors.navy }]}>Need Help?</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Chat with Dr Toni</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open cart" onPress={() => router.push('/order/cart')} style={[styles.headerButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="cart-outline" size={22} color={colors.primary} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Clear chat history" disabled={clearing} onPress={confirmClearHistory} style={[styles.headerButton, { borderColor: colors.border, backgroundColor: colors.card, opacity: clearing ? 0.5 : 1 }]}>
            {clearing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="trash-outline" size={20} color={colors.primary} />}
          </Pressable>
        </View>

        <View style={[styles.doctorBanner, { backgroundColor: colors.accent }]}>
          <View style={[styles.bannerAvatar, { backgroundColor: colors.card }]}>
            <Ionicons name="medical" size={27} color={colors.primary} />
          </View>
          <View style={styles.bannerCopy}>
            <Text style={[styles.bannerTitle, { color: colors.navy }]}>Dr Toni 👋</Text>
            <Text style={[styles.bannerSubtitle, { color: colors.muted }]}>Tell me how you’re feeling</Text>
          </View>
          <View style={[styles.onlineDot, { backgroundColor: '#22C55E' }]} />
          <Text style={[styles.onlineLabel, { color: colors.muted }]}>Online</Text>
        </View>

        {online === false ? (
          <View style={[styles.offlineBanner, { backgroundColor: colors.lavender }]}>
            <Ionicons name="cloud-offline-outline" size={15} color={colors.muted} />
            <Text style={[styles.offlineText, { color: colors.muted }]}>Offline · Showing saved conversation</Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={sending ? (
            <View style={styles.typingRow}>
              <View style={[styles.doctorAvatar, { backgroundColor: colors.accent }]}><Ionicons name="medical" size={18} color={colors.primary} /></View>
              <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.typingText, { color: colors.muted }]}>Dr Toni is thinking…</Text>
              </View>
            </View>
          ) : undefined}
        />

        <View style={[styles.composer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={[styles.inputWrap, { backgroundColor: colors.lavender, borderColor: colors.border }]}>
            <TextInput
              accessibilityLabel="Describe your symptoms"
              value={draft}
              onChangeText={setDraft}
              placeholder="Describe your symptoms…"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={1500}
              editable={!sending}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={() => void sendMessage()}
              style={[styles.input, { color: colors.navy }]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !draft.trim() || sending }}
            disabled={!draft.trim() || sending}
            onPress={() => void sendMessage()}
            style={({ pressed }) => [styles.sendButton, { backgroundColor: colors.primary }, (!draft.trim() || sending) && styles.sendDisabled, pressed && styles.pressed]}
          >
            <Ionicons name="send" size={19} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function ChatScreen() {
  return <LoginRequiredGate><ChatContent /></LoginRequiredGate>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  keyboard: { flex: 1 },
  header: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 42, height: 42, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  headerTitle: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  doctorBanner: { minHeight: 86, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
  offlineBanner: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
  offlineText: { fontSize: 11, fontWeight: '600' },
  bannerAvatar: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bannerCopy: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: '800' },
  bannerSubtitle: { fontSize: 12, marginTop: 4 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },
  onlineLabel: { fontSize: 11, marginLeft: -8 },
  messageList: { flexGrow: 1, paddingHorizontal: 15, paddingVertical: 18, gap: 16 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  patientMessageRow: { justifyContent: 'flex-end' },
  messageContent: { maxWidth: '84%', flexShrink: 1 },
  patientMessageContent: { maxWidth: '82%' },
  doctorAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 19 },
  doctorBubble: { borderWidth: 1, borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 12 },
  messageText: { fontSize: 14, lineHeight: 21 },
  patientBubble: { borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 15, paddingVertical: 12 },
  patientText: { color: '#FFFFFF', fontSize: 14, lineHeight: 21 },
  messageTime: { fontSize: 10, marginTop: 5, marginHorizontal: 3 },
  recommendation: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 9, paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderRadius: 13 },
  recommendationIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recommendationText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, marginTop: 3 },
  typingBubble: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 18, borderBottomLeftRadius: 6, paddingHorizontal: 13 },
  typingText: { fontSize: 12 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth },
  inputWrap: { flex: 1, minHeight: 48, maxHeight: 120, borderWidth: 1, borderRadius: 24, justifyContent: 'center', paddingHorizontal: 15 },
  input: { minHeight: 44, maxHeight: 112, paddingTop: 12, paddingBottom: 10, fontSize: 14, lineHeight: 20 },
  sendButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.55 },
  pressed: { opacity: 0.78 },
});
