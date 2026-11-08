import { LoginRequiredGate } from '@/components/ui/LoginRequiredGate';
import { Colors } from '@/constants/theme';
import { naira } from '@/constants/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getApiErrorMessage } from '@/services/apiResponse';
import { walletService } from '@/services/endpoints';
import { paystackResumeHtml } from '@/services/paystackCheckout';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const MIN_TOPUP_AMOUNT = 1000;
const paymentMethods = [
  { id: 'card', title: 'Debit or credit card', subtitle: 'Visa, Mastercard and Verve', icon: 'card-outline' },
  { id: 'bank_transfer', title: 'Bank transfer', subtitle: 'Pay from your bank app', icon: 'swap-horizontal-outline' },
  { id: 'ussd', title: 'USSD', subtitle: 'Pay with your bank USSD code', icon: 'phone-portrait-outline' },
  { id: 'bank', title: 'Bank account', subtitle: 'Pay directly from your account', icon: 'business-outline' },
] as const;
type PaymentMethod = (typeof paymentMethods)[number]['id'];
type WalletTransaction = {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  date?: Date;
};
type WalletCard = { walletId: number | null; status: number; cardNo: string; balance: number; transactions: WalletTransaction[] };

function unwrap(value: unknown): Record<string, unknown> {
  let current = value;
  for (let depth = 0; depth < 3 && current && typeof current === 'object' && !Array.isArray(current); depth += 1) {
    const object = current as Record<string, unknown>;
    if ('data' in object && object.data && typeof object.data === 'object') current = object.data;
    else if ('card' in object && object.card && typeof object.card === 'object') current = object.card;
    else return object;
  }
  return current && typeof current === 'object' && !Array.isArray(current) ? current as Record<string, unknown> : {};
}

function asTransactionList(value: unknown): WalletTransaction[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const row = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
    const rawAmount = Number(row.amount ?? row.value ?? 0);
    const rawDate = row.created_at ?? row.createdAt ?? row.date ?? row.transaction_date;
    const date = rawDate ? new Date(String(rawDate)) : undefined;
    const fallbackTitle = rawAmount >= 0 ? 'Wallet credit' : 'Wallet payment';
    return {
      id: String(row.id ?? row.transaction_id ?? index),
      title: String(row.description ?? row.title ?? row.name ?? row.reference ?? fallbackTitle),
      subtitle: String(row.trans_type === 'add_fund' ? 'Added' : row.trans_type ?? row.type ?? row.status ?? (rawAmount >= 0 ? 'Added' : 'Payment')),
      amount: rawAmount,
      ...(date && !Number.isNaN(date.getTime()) ? { date } : {}),
    };
  });
}

function normalizeCard(value: unknown): WalletCard | null {
  const card = unwrap(value);
  const cardNo = String(card.card_no ?? card.cardNo ?? '');
  if (!cardNo && card.wallet_balance === undefined && card.balance === undefined) return null;
  return {
    walletId: Number.isFinite(Number(card.id)) && Number(card.id) > 0 ? Number(card.id) : null,
    status: Number(card.status ?? 1),
    cardNo,
    balance: Number(card.wallet_balance ?? card.balance ?? 0),
    transactions: asTransactionList(card.transactions ?? card.transaction_history),
  };
}

function formatDate(date?: Date) {
  return date ? date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unavailable';
}

function WalletContent() {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [wallet, setWallet] = useState<WalletCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activating, setActivating] = useState(false);
  const [showNumber, setShowNumber] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');
  const [missingCard, setMissingCard] = useState(false);
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [methodModalVisible, setMethodModalVisible] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [processingTopup, setProcessingTopup] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const topupIntent = useRef<{ amount: number; startingBalance: number } | null>(null);
  const handledPayment = useRef(false);
  const initializingPayment = useRef(false);
  const parsedTopupAmount = Number(topupAmount);
  const validTopupAmount = Number.isSafeInteger(parsedTopupAmount) && parsedTopupAmount >= MIN_TOPUP_AMOUNT;

  const loadWallet = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    else setLoading(true);
    setError('');
    setMissingCard(false);
    try {
      const result = await walletService.getCardDetails();
      const card = normalizeCard(result);
      setWallet(card);
      setMissingCard(!card);
    } catch (e) {
      const status = (e as { response?: { status?: number }; status?: number })?.response?.status ?? (e as { status?: number })?.status;
      const message = getApiErrorMessage(e, 'Unable to load your wallet right now.');
      if (status === 404 || /card.*(not found|does not exist|inactive)/i.test(message)) {
        setMissingCard(true);
        setWallet(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadWallet());
  }, [loadWallet]);

  const activate = async () => {
    if (activating) return;
    setActivating(true);
    setError('');
    try {
      const result = await walletService.activateCard();
      const card = normalizeCard(result);
      if (card) setWallet(card);
      else await loadWallet();
      setMissingCard(false);
    } catch (e) {
      setError(getApiErrorMessage(e, 'We could not activate your wallet. Please try again.'));
    } finally {
      setActivating(false);
    }
  };

  const transactions = useMemo(() => {
    const list = wallet?.transactions ?? [];
    return showAll ? list : list.slice(0, 5);
  }, [wallet?.transactions, showAll]);

  const openTopup = () => {
    if (!wallet) {
      Alert.alert('Activate your wallet', 'Activate your wallet before adding funds.');
      return;
    }
    if (wallet.status !== 1) {
      Alert.alert('Wallet inactive', 'Your wallet is inactive. Please contact support before adding funds.');
      return;
    }
    setTopupAmount('');
    setAmountModalVisible(true);
  };

  const refreshAfterTopup = async (startingBalance: number, amount: number) => {
    setCheckingPayment(true);
    let latest: WalletCard | null = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        latest = normalizeCard(await walletService.getCardDetails());
        if (latest) {
          setWallet(latest);
          if (latest.balance >= startingBalance + amount) {
            setCheckingPayment(false);
            Alert.alert('Wallet funded', `${naira(amount)} has been added to your wallet.`);
            return;
          }
        }
      } catch (e) {
        setCheckingPayment(false);
        Alert.alert('Unable to confirm wallet credit', getApiErrorMessage(e, 'Pull down to refresh your wallet shortly.'));
        return;
      }
    }
    if (latest) setWallet(latest);
    setCheckingPayment(false);
    Alert.alert('Wallet credit pending', 'Checkout completed, but wallet credit has not been confirmed yet. Pull down to refresh shortly.');
  };

  const startTopupPayment = async () => {
    if (initializingPayment.current || accessCode || checkingPayment) return;
    if (!wallet || wallet.status !== 1) {
      Alert.alert('Wallet unavailable', 'Refresh or activate your wallet before continuing.');
      return;
    }
    if (!validTopupAmount) {
      Alert.alert('Invalid amount', 'Enter a whole naira amount of at least ₦1,000.');
      return;
    }
    initializingPayment.current = true;
    setProcessingTopup(true);
    try {
      const result: unknown = await walletService.initializeTopup(parsedTopupAmount, selectedMethod);
      const intent = unwrap(result);
      const amount = Number(intent.amount);
      if (typeof intent.access_code !== 'string' || !intent.access_code.trim() ||
          typeof intent.reference !== 'string' || !intent.reference.trim() ||
          !Number.isSafeInteger(amount) || amount < MIN_TOPUP_AMOUNT) {
        throw new Error('The server did not return valid wallet payment details.');
      }
      topupIntent.current = { amount, startingBalance: wallet.balance };
      handledPayment.current = false;
      setMethodModalVisible(false);
      setAccessCode(intent.access_code);
    } catch (e) {
      Alert.alert('Unable to start top-up', getApiErrorMessage(e, 'Please try again.'));
    } finally {
      initializingPayment.current = false;
      setProcessingTopup(false);
    }
  };

  const finishTopup = (event: { nativeEvent: { data: string } }) => {
    let message: { event?: string; data?: { message?: string } };
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      Alert.alert('Payment response invalid', 'Unable to read the checkout response. Refresh your wallet before trying again.');
      return;
    }
    if (message.event === 'load' || handledPayment.current) return;
    if (!['success', 'cancel', 'error'].includes(message.event ?? '')) {
      Alert.alert('Payment response invalid', 'An unexpected checkout response was received.');
      return;
    }
    handledPayment.current = true;
    setAccessCode(null);
    if (message.event === 'success' && topupIntent.current) {
      const { amount, startingBalance } = topupIntent.current;
      void refreshAfterTopup(startingBalance, amount);
    } else {
      setMethodModalVisible(true);
      Alert.alert(message.event === 'cancel' ? 'Checkout cancelled' : 'Payment failed',
        message.data?.message || 'Refresh your wallet before trying again if a debit occurred.');
    }
  };

  const maskedNumber = wallet?.cardNo
    ? showNumber ? wallet.cardNo.replace(/(.{4})/g, '$1 ').trim() : `••••  ••••  ••••  ${wallet.cardNo.slice(-4)}`
    : 'Virtual wallet';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F7F7FC' }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/account')} style={[styles.headerButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="arrow-back" size={21} color={colors.primary} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.navy }]}>My wallet</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Virtual card & transactions</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh wallet" onPress={() => void loadWallet(true)} style={[styles.headerButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {refreshing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh" size={20} color={colors.primary} />}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadWallet(true)} tintColor={colors.primary} />}>
        <LinearGradient colors={colorScheme === 'dark' ? ['#4C1D95', '#6D28D9', '#8B5CF6'] : ['#6D28D9', '#7C3AED', '#9B6BFA']} style={styles.hero}>
          <View style={styles.heroTop}>
          <View style={styles.heroLabelRow}><Ionicons name="shield-checkmark-outline" size={16} color="#E9D5FF" /><Text style={styles.heroEyebrow}>PYRAMIDS VIRTUAL WALLET</Text></View>
            <Ionicons name="card-outline" size={30} color="rgba(255,255,255,0.75)" />
          </View>
          <View style={styles.chip}><View style={styles.chipTile} /><View style={styles.chipTile} /><View style={styles.chipTile} /><View style={styles.chipTile} /></View>
          <View style={styles.cardNumberRow}>
            <Text style={styles.cardNumber}>{maskedNumber}</Text>
            {wallet?.cardNo ? <Pressable accessibilityRole="button" accessibilityLabel={showNumber ? 'Hide wallet number' : 'Show wallet number'} onPress={() => setShowNumber((current) => !current)} style={styles.revealButton}><Ionicons name={showNumber ? 'eye-off-outline' : 'eye-outline'} size={17} color="#FFFFFF" /></Pressable> : null}
          </View>
          <View style={styles.cardBottom}>
            <View><Text style={styles.heroCaption}>WALLET BALANCE</Text><Text style={styles.balance}>{wallet ? naira(wallet.balance) : '—'}</Text></View>
            <Ionicons name="radio-outline" size={27} color="rgba(255,255,255,0.75)" />
          </View>
          <View pointerEvents="none" style={styles.heroOrbOne} /><View pointerEvents="none" style={styles.heroOrbTwo} />
        </LinearGradient>
        {checkingPayment ? <View style={[styles.paymentStatus, { backgroundColor: colors.accent }]}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.paymentStatusText, { color: colors.navy }]}>Confirming wallet credit…</Text></View> : null}

        {loading ? <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}><ActivityIndicator color={colors.primary} /><Text style={[styles.stateText, { color: colors.muted }]}>Loading wallet…</Text></View> : null}
        {!loading && missingCard ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: colors.accent }]}><Ionicons name="wallet-outline" size={24} color={colors.primary} /></View>
            <Text style={[styles.stateTitle, { color: colors.navy }]}>Activate your virtual wallet</Text>
            <Text style={[styles.stateText, { color: colors.muted }]}>Create a wallet to view your balance and transactions here.</Text>
            <Pressable disabled={activating} onPress={() => void activate()} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>{activating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Activate wallet</Text>}</Pressable>
          </View>
        ) : null}
        {!loading && error ? <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="alert-circle-outline" size={20} color={colors.error} /><Text style={[styles.errorText, { color: colors.navy }]}>{error}</Text><Pressable onPress={() => void loadWallet()}><Text style={[styles.retry, { color: colors.primary }]}>Try again</Text></Pressable></View> : null}

        <View style={styles.quickHeading}><Text style={[styles.sectionTitle, { color: colors.navy }]}>Quick actions</Text></View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Add funds to wallet" disabled={processingTopup || checkingPayment || !!accessCode} onPress={openTopup} style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: processingTopup || checkingPayment || accessCode ? 0.6 : 1 }]}>
            <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}><Ionicons name="add-circle-outline" size={23} color={colors.primary} /></View><Text style={[styles.actionLabel, { color: colors.navy }]}>Add funds</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/order/tests')} style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}><Ionicons name="flask-outline" size={22} color={colors.primary} /></View><Text style={[styles.actionLabel, { color: colors.navy }]}>Book a test</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/results')} style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}><Ionicons name="document-text-outline" size={22} color={colors.primary} /></View><Text style={[styles.actionLabel, { color: colors.navy }]}>My results</Text>
          </Pressable>
        </View>

        <View style={styles.transactionsHeading}>
          <View><Text style={[styles.sectionTitle, { color: colors.navy }]}>Transaction history</Text><Text style={[styles.sectionSubtitle, { color: colors.muted }]}>Your latest wallet activity</Text></View>
          {(wallet?.transactions.length ?? 0) > 5 ? <Pressable onPress={() => setShowAll((current) => !current)}><Text style={[styles.viewAll, { color: colors.primary }]}>{showAll ? 'Show less' : 'View all'}</Text></Pressable> : null}
        </View>
        <View style={[styles.transactionList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {transactions.map((item, index) => {
            const credit = item.amount >= 0;
            return <View key={item.id} style={[styles.transactionRow, index < transactions.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <View style={[styles.transactionIcon, { backgroundColor: credit ? '#ECFDF5' : colors.accent }]}><Ionicons name={credit ? 'arrow-down-outline' : 'arrow-up-outline'} size={19} color={credit ? '#16A34A' : colors.primary} /></View>
              <View style={styles.transactionCopy}><Text numberOfLines={1} style={[styles.transactionTitle, { color: colors.navy }]}>{item.title}</Text><Text style={[styles.transactionDate, { color: colors.muted }]}>{item.subtitle} · {formatDate(item.date)}</Text></View>
              <Text style={[styles.transactionAmount, { color: credit ? '#16A34A' : colors.navy }]}>{credit ? '+' : '−'}{naira(Math.abs(item.amount))}</Text>
            </View>;
          })}
          {!loading && !error && transactions.length === 0 ? <View style={styles.emptyTransactions}><View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}><Ionicons name="receipt-outline" size={22} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.navy }]}>No transactions yet</Text><Text style={[styles.emptyText, { color: colors.muted }]}>Wallet activity will appear here when available.</Text></View> : null}
        </View>
        <Text style={[styles.note, { color: colors.muted }]}>Top-ups are credited after Paystack confirms payment with the wallet service.</Text>
      </ScrollView>

      <Modal visible={amountModalVisible} transparent animationType="fade" onRequestClose={() => setAmountModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: colors.accent }]}><Ionicons name="wallet-outline" size={22} color={colors.primary} /></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close top-up" onPress={() => setAmountModalVisible(false)} style={styles.modalClose}><Ionicons name="close" size={22} color={colors.muted} /></Pressable>
            </View>
            <Text style={[styles.modalTitle, { color: colors.navy }]}>Add funds</Text>
            <Text style={[styles.modalDescription, { color: colors.muted }]}>Enter the amount to add to your wallet. Minimum top-up is ₦1,000.</Text>
            <View style={[styles.amountInputWrap, { borderColor: colors.border, backgroundColor: colors.lavender }]}>
              <Text style={[styles.currencyPrefix, { color: colors.muted }]}>₦</Text>
              <TextInput accessibilityLabel="Top-up amount in naira" value={topupAmount} onChangeText={(value) => setTopupAmount(value.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="1,000" placeholderTextColor={colors.muted} maxLength={9} style={[styles.amountInput, { color: colors.navy }]} />
            </View>
            <View style={styles.amountSuggestions}>{[1000, 2000, 5000].map((amount) => <Pressable key={amount} onPress={() => setTopupAmount(String(amount))} style={[styles.amountSuggestion, { backgroundColor: colors.accent }]}><Text style={[styles.amountSuggestionText, { color: colors.primary }]}>{naira(amount)}</Text></Pressable>)}</View>
            {topupAmount.length > 0 && !validTopupAmount ? <Text style={[styles.validationText, { color: colors.error }]}>Enter a whole naira amount of at least ₦1,000.</Text> : null}
            <Pressable accessibilityRole="button" disabled={!validTopupAmount} onPress={() => { setAmountModalVisible(false); setMethodModalVisible(true); }} style={[styles.modalPrimaryButton, { backgroundColor: colors.primary, opacity: validTopupAmount ? 1 : 0.5 }]}><Text style={styles.modalPrimaryText}>Choose payment method</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={Boolean(accessCode)} animationType="slide" onRequestClose={() => finishTopup({ nativeEvent: { data: '{"event":"cancel"}' } })}>
        <SafeAreaView style={[styles.screen, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.navy }]}>Secure Paystack checkout</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close checkout" onPress={() => finishTopup({ nativeEvent: { data: '{"event":"cancel"}' } })}><Ionicons name="close" size={24} color={colors.primary} /></Pressable>
          </View>
          {accessCode ? <WebView
            source={{ html: paystackResumeHtml(accessCode) }}
            onMessage={finishTopup}
            onError={() => finishTopup({ nativeEvent: { data: '{"event":"error","data":{"message":"Could not load Paystack checkout. Please try again."}}' } })}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
          /> : null}
        </SafeAreaView>
      </Modal>

      <Modal visible={methodModalVisible} transparent animationType="fade" onRequestClose={() => { setMethodModalVisible(false); setAmountModalVisible(true); }}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Pressable accessibilityRole="button" accessibilityLabel="Back to amount" onPress={() => { setMethodModalVisible(false); setAmountModalVisible(true); }} style={styles.modalClose}><Ionicons name="arrow-back" size={21} color={colors.primary} /></Pressable>
              <View style={[styles.stepBadge, { backgroundColor: colors.accent }]}><Text style={[styles.stepBadgeText, { color: colors.primary }]}>2 of 2</Text></View>
            </View>
            <Text style={[styles.modalTitle, { color: colors.navy }]}>Payment method</Text>
            <Text style={[styles.modalDescription, { color: colors.muted }]}>Choose how you’d like to add {naira(parsedTopupAmount)}.</Text>
            <View style={styles.paymentMethodList}>{paymentMethods.map((method) => {
              const selected = selectedMethod === method.id;
              return (
                <Pressable key={method.id} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: processingTopup }} disabled={processingTopup} onPress={() => setSelectedMethod(method.id)} style={[styles.paymentMethodRow, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.lavender : colors.card }]}>
                  <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}><Ionicons name={method.icon} size={20} color={colors.primary} /></View>
                  <View style={styles.paymentMethodCopy}><Text style={[styles.paymentMethodTitle, { color: colors.navy }]}>{method.title}</Text><Text style={[styles.paymentMethodSubtitle, { color: colors.muted }]}>{method.subtitle}</Text></View>
                  <View style={[styles.radioOuter, { borderColor: selected ? colors.primary : colors.border }]}>{selected ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}</View>
                </Pressable>
              );
            })}</View>
            <View style={[styles.secureNotice, { backgroundColor: colors.accent }]}><Ionicons name="lock-closed-outline" size={15} color={colors.primary} /><Text style={[styles.secureNoticeText, { color: colors.navy }]}>Payment is securely handled by Paystack.</Text></View>
            <Pressable accessibilityRole="button" disabled={processingTopup} onPress={startTopupPayment} style={[styles.modalPrimaryButton, { backgroundColor: colors.primary, opacity: processingTopup ? 0.65 : 1 }]}>{processingTopup ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="lock-closed-outline" size={17} color="#FFFFFF" />}<Text style={styles.modalPrimaryText}>{processingTopup ? 'Opening Paystack…' : `Pay ${naira(parsedTopupAmount)}`}</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function WalletScreen() {
  return <LoginRequiredGate><WalletContent /></LoginRequiredGate>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth }, headerButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }, headerTitle: { flex: 1 }, title: { fontSize: 19, fontWeight: '800' }, subtitle: { fontSize: 12, marginTop: 2 },
  content: { padding: 18, paddingBottom: 38 }, hero: { minHeight: 222, borderRadius: 26, padding: 22, overflow: 'hidden', justifyContent: 'space-between', shadowColor: '#6D28D9', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, heroEyebrow: { color: '#F3E8FF', fontSize: 11, letterSpacing: 1.2, fontWeight: '800' }, chip: { width: 43, height: 31, borderRadius: 7, borderColor: 'rgba(255,255,255,0.5)', borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', marginTop: 15 }, chipTile: { width: '50%', height: '50%', borderColor: 'rgba(255,255,255,0.5)', borderWidth: 0.5 },
  cardNumberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cardNumber: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 1.1, marginTop: 12, flexShrink: 1 }, cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 }, heroCaption: { color: '#E9D5FF', fontSize: 10, letterSpacing: 1.2, fontWeight: '700' }, balance: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 5 }, heroOrbOne: { position: 'absolute', right: -55, top: -70, width: 190, height: 190, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 100 }, heroOrbTwo: { position: 'absolute', right: 12, bottom: -115, width: 190, height: 190, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 100 }, revealButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  stateCard: { alignItems: 'center', padding: 22, borderRadius: 22, borderWidth: 1, marginTop: 16 }, stateIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, stateTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' }, stateText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 }, primaryButton: { minHeight: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, marginTop: 17 }, primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }, errorCard: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 16 }, errorText: { flex: 1, fontSize: 12, lineHeight: 17 }, retry: { fontSize: 12, fontWeight: '800' },
  quickHeading: { marginTop: 25, marginBottom: 11 }, sectionTitle: { fontSize: 17, fontWeight: '800' }, actions: { flexDirection: 'row', gap: 9 }, actionCard: { flex: 1, minHeight: 94, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, gap: 7 }, actionIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, actionLabel: { fontSize: 11, fontWeight: '700' }, transactionsHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 27, marginBottom: 12 }, sectionSubtitle: { fontSize: 12, marginTop: 4 }, viewAll: { fontSize: 13, fontWeight: '800' }, transactionList: { borderWidth: 1, borderRadius: 21, paddingHorizontal: 14 }, transactionRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11 }, transactionIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, transactionCopy: { flex: 1 }, transactionTitle: { fontSize: 13, fontWeight: '800' }, transactionDate: { fontSize: 10, marginTop: 4 }, transactionAmount: { fontSize: 12, fontWeight: '800' }, emptyTransactions: { alignItems: 'center', paddingVertical: 26 }, emptyIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, emptyTitle: { fontSize: 14, fontWeight: '800' }, emptyText: { fontSize: 11, marginTop: 5, textAlign: 'center' }, note: { fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 13 },
  paymentStatus: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, marginTop: 12, paddingHorizontal: 12 }, paymentStatusText: { fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20, 15, 36, 0.46)', justifyContent: 'center', alignItems: 'center', padding: 18 }, modalCard: { width: '100%', maxWidth: 440, borderRadius: 26, padding: 22 }, modalHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, modalClose: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, modalTitle: { fontSize: 21, fontWeight: '800', marginTop: 14 }, modalDescription: { fontSize: 13, lineHeight: 19, marginTop: 6 }, amountInputWrap: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 17, paddingHorizontal: 16, marginTop: 20 }, currencyPrefix: { fontSize: 23, fontWeight: '800', marginRight: 9 }, amountInput: { flex: 1, fontSize: 23, fontWeight: '800', paddingVertical: 10 }, amountSuggestions: { flexDirection: 'row', gap: 8, marginTop: 12 }, amountSuggestion: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 12 }, amountSuggestionText: { fontSize: 11, fontWeight: '800' }, validationText: { fontSize: 11, marginTop: 10 }, modalPrimaryButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 15, paddingHorizontal: 14, marginTop: 18 }, modalPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }, stepBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11 }, stepBadgeText: { fontSize: 11, fontWeight: '800' }, paymentMethodList: { gap: 8, marginTop: 16 }, paymentMethodRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.3, borderRadius: 15, paddingHorizontal: 10 }, paymentMethodCopy: { flex: 1 }, paymentMethodTitle: { fontSize: 12, fontWeight: '800' }, paymentMethodSubtitle: { fontSize: 10, marginTop: 3 }, radioOuter: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }, radioInner: { width: 9, height: 9, borderRadius: 5 }, secureNotice: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, marginTop: 13, borderRadius: 12 }, secureNoticeText: { fontSize: 10, flex: 1 },
});
