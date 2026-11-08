import { LoginRequiredGate } from '@/components/ui/LoginRequiredGate';
import { naira } from '@/constants/format';
import { Colors } from '@/constants/theme';
import { getApiErrorMessage } from '@/services/apiResponse';
import { orderService } from '@/services/endpoints';
import { RootState } from '@/store';
import { clearCart } from '@/store/cartSlice';
import { clearOrderRecipient } from '@/store/checkoutSlice';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useDispatch, useSelector } from 'react-redux';

const paystackMethods = [
  { id: 'card', title: 'Debit or credit card', detail: 'Visa, Mastercard and Verve', icon: 'card-outline' as const },
  { id: 'bank_transfer', title: 'Bank transfer', detail: 'Pay from your bank app', icon: 'swap-horizontal-outline' as const },
 ] as const;
type PaymentChannel = typeof paystackMethods[number]['id'];

function paystackResumeHtml(accessCode: string) {
  const encodedAccessCode = JSON.stringify(accessCode);
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"></head><body style="margin:0;background:#fff"><script src="https://js.paystack.co/v2/inline.js"></script><script>
    (function(){
      var started = false;
      function send(event, data){ window.ReactNativeWebView.postMessage(JSON.stringify({event:event,data:data || null})); }
      function start(){
        if (started) return;
        if (!window.PaystackPop) { setTimeout(start, 100); return; }
        started = true;
        try {
          var paystack = new PaystackPop();
          paystack.resumeTransaction(${encodedAccessCode}, {
            onLoad: function(data){ send('load', data); },
            onSuccess: function(data){ send('success', data); },
            onCancel: function(){ send('cancel'); },
            onError: function(error){ send('error', {message: error && error.message ? error.message : 'Paystack checkout could not load.'}); }
          });
        } catch(error) { send('error', {message: error && error.message ? error.message : 'Paystack checkout could not start.'}); }
      }
      start();
    })();
  </script></body></html>`;
}

function PaymentMethodContent() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const items = useSelector((state: RootState) => state.cart.items);
  const recipient = useSelector((state: RootState) => state.checkout.recipient);
  const amount = Number(Array.isArray(params.amount) ? params.amount[0] : params.amount || 0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannel>('card');
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [initializedAmount, setInitializedAmount] = useState(amount);
  const handledPaymentRef = useRef(false);
  const scalar = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
  };

  const startPayment = async () => {
    if (processing || amount <= 0) return;
    if (!recipient) {
      Alert.alert('Recipient required', 'Go back to collection details and choose who this order is for.');
      return;
    }
    if (items.some((item) => item.quantity !== 1)) {
      Alert.alert('Quantity checkout unavailable', 'Each test or package can be ordered once. Remove duplicate items and add each selection once to continue.');
      return;
    }
    const testlist: { id: number }[] = [];
    const packagelist: { id: number }[] = [];
    for (const item of items) {
      const rawId = item.type === 'package' && item.id.startsWith('package:')
        ? item.id.slice('package:'.length)
        : item.id;
      const id = Number(rawId);
      const list = item.type === 'package' ? packagelist : testlist;
      if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id <= 0 || list.some((entry) => entry.id === id)) {
        Alert.alert('Invalid cart item', 'A test or package ID is invalid or repeated. Remove the affected items and add them again.');
        return;
      }
      list.push({ id });
    }
    if (!testlist.length && !packagelist.length) {
      Alert.alert('Cart empty', 'Add a test or package before starting payment.');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      const isProvider = user?.role?.toLowerCase() === 'provider';
      const recipientPayload = recipient.type === 'self'
        ? { type: 'self' as const }
        : recipient.type === 'existing'
          ? { type: 'existing' as const, patient_id: recipient.patient_id }
          : { type: 'new' as const, patient: recipient.patient };
      const result = await orderService.initializeOrder({
        recipient: recipientPayload,
        orderInfo: {
          service_type: scalar('collectionType') === 'home' ? 'home' : 'Visit to branch',
          clinicalinfo: scalar('clinicalInfo'),
          address: scalar('collectionType') === 'home' ? scalar('address') : '',
          addressLandmark: scalar('collectionType') === 'home' ? scalar('landmark') : '',
          referrer: isProvider ? Number(user?.id) || 0 : 0,
          referName: isProvider ? [user?.firstname, user?.lastname].filter(Boolean).join(' ') : '',
        },
        testlist,
        ...(packagelist.length ? { packagelist } : {}),
        channels: [selectedChannel],
      }) as Record<string, unknown>;

      const serverAccessCode = typeof result?.access_code === 'string' ? result.access_code : '';
      const reference = typeof result?.reference === 'string' ? result.reference : '';
      if (!serverAccessCode || !reference) throw new Error('The server did not return a valid Paystack access code and reference.');
      const serverAmount = Number(result.amount);
      if (!Number.isSafeInteger(serverAmount) || serverAmount <= 0) throw new Error('The server did not return a valid payment amount.');

      setPaymentReference(reference);
      setInitializedAmount(serverAmount);
      handledPaymentRef.current = false;
      setAccessCode(serverAccessCode);
    } catch (paymentError) {
      const message = getApiErrorMessage(paymentError, 'We could not start the payment. Please try again.');
      setError(message);
      Alert.alert('Unable to start payment', message);
    } finally {
      setProcessing(false);
    }
  };

  const finishPayment = (event: { nativeEvent: { data: string } }) => {
    let message: { event?: string; data?: { message?: string } };
    try { message = JSON.parse(event.nativeEvent.data); } catch { return; }
    if (message.event === 'load') return;
    if (handledPaymentRef.current) return;
    handledPaymentRef.current = true;
    setAccessCode(null);
    if (message.event === 'success') {
      dispatch(clearCart());
      dispatch(clearOrderRecipient());
      router.replace({ pathname: '/order/payment-success', params: { amount: String(initializedAmount), reference: paymentReference } });
      return;
    }
    const reason = message.event === 'cancel' ? 'cancelled' : message.data?.message || 'Paystack checkout could not be completed.';
    router.replace({ pathname: '/order/payment-failed', params: {
      amount: String(initializedAmount), reason,
      collectionType: scalar('collectionType'), address: scalar('address'), landmark: scalar('landmark'),
      clinicalInfo: scalar('clinicalInfo'), quantity: scalar('quantity'),
    } });
  };

  const closeCheckout = () => finishPayment({ nativeEvent: { data: JSON.stringify({ event: 'cancel' }) } });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F8FAFC' }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to order summary" onPress={() => router.canGoBack() ? router.back() : router.replace('/order/payment')} style={[styles.backButton, { borderColor: colors.border, backgroundColor: colors.card }]}><Ionicons name="arrow-back" size={21} color={colors.navy} /></Pressable>
        <View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.navy }]}>Payment method</Text><Text style={[styles.headerSubtitle, { color: colors.muted }]}>Choose your method in Paystack checkout</Text></View>
        <View style={[styles.stepBadge, { backgroundColor: colors.accent }]}><Text style={[styles.stepText, { color: colors.primary }]}>3 of 3</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.amountCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.amountCaption}>AMOUNT DUE</Text><Text style={styles.amountValue}>{naira(amount)}</Text>
          <View style={styles.secureLine}><Ionicons name="lock-closed-outline" size={14} color="#FFFFFF" /><Text style={styles.secureText}>Secure payment powered by Paystack</Text></View>
        </View>
        <Text style={[styles.sectionTitle, { color: colors.navy }]}>Payment options</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>Choose how you’d like to pay. Your payment will be processed securely by Paystack.</Text>
        <View style={styles.methodList}>{paystackMethods.map((method) => {
          const selected = selectedChannel === method.id;
          return <Pressable key={method.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setSelectedChannel(method.id)} style={[styles.methodCard, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }]}>
            <View style={[styles.methodIcon, { backgroundColor: colors.accent }]}><Ionicons name={method.icon} size={21} color={colors.primary} /></View>
            <View style={styles.methodCopy}><Text style={[styles.methodTitle, { color: colors.navy }]}>{method.title}</Text><Text style={[styles.methodDescription, { color: colors.muted }]}>{method.detail}</Text></View>
            <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>{selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}</View>
          </Pressable>;
        })}</View>
        <View style={[styles.notice, { backgroundColor: colors.accent }]}><Ionicons name="lock-closed-outline" size={18} color={colors.primary} /><Text style={[styles.noticeText, { color: colors.navy }]}>Your payment is protected by Paystack’s secure checkout. Your card details are handled securely by Paystack.</Text></View>
        {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.footerTotal}><Text style={[styles.footerLabel, { color: colors.muted }]}>Total</Text><Text style={[styles.footerAmount, { color: colors.navy }]}>{naira(amount)}</Text></View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: processing || amount <= 0 }} disabled={processing || amount <= 0} onPress={() => void startPayment()} style={({ pressed }) => [styles.continueButton, { backgroundColor: colors.primary }, pressed && styles.pressed, (processing || amount <= 0) && styles.disabled]}>
          {processing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="lock-closed-outline" size={17} color="#FFFFFF" />}
          <Text style={styles.continueText}>{processing ? 'Starting secure checkout…' : `Continue to Paystack · ${naira(amount)}`}</Text>
        </Pressable>
      </View>
      <Modal visible={Boolean(accessCode)} animationType="slide" onRequestClose={closeCheckout}>
        <SafeAreaView style={styles.paystackModal} edges={['top', 'left', 'right']}>
          <View style={[styles.paystackHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.paystackTitle, { color: colors.navy }]}>Secure Paystack checkout</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close Paystack checkout" onPress={closeCheckout} style={[styles.modalClose, { borderColor: colors.border }]}><Ionicons name="close" size={21} color={colors.navy} /></Pressable>
          </View>
          {accessCode ? <WebView
            source={{ html: paystackResumeHtml(accessCode) }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            onMessage={finishPayment}
            onError={() => finishPayment({ nativeEvent: { data: JSON.stringify({ event: 'error', data: { message: 'Could not load Paystack checkout. Please try again.' } }) } })}
            startInLoadingState
            renderLoading={() => <View style={styles.webViewLoading}><ActivityIndicator size="large" color={colors.primary} /></View>}
          /> : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default function PaymentMethodScreen() { return <LoginRequiredGate><PaymentMethodContent /></LoginRequiredGate>; }

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1 }, headerTitle: { fontSize: 19, fontWeight: '800' }, headerSubtitle: { marginTop: 3, fontSize: 11 },
  stepBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 }, stepText: { fontSize: 11, fontWeight: '800' }, content: { padding: 18, paddingTop: 20, paddingBottom: 28 }, amountCard: { borderRadius: 20, padding: 19, marginBottom: 24 },
  amountCaption: { color: 'rgba(255,255,255,0.82)', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, amountValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 8 }, secureLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }, secureText: { color: '#FFFFFF', fontSize: 11 },
  sectionTitle: { fontSize: 17, fontWeight: '800' }, sectionSubtitle: { fontSize: 12, lineHeight: 18, marginTop: 4 }, methodList: { gap: 10, marginTop: 16 }, methodCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderWidth: 1.5, borderRadius: 16 }, methodIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, methodCopy: { flex: 1 }, methodTitle: { fontSize: 13, fontWeight: '800' }, methodDescription: { fontSize: 11, marginTop: 4 }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }, radioDot: { width: 10, height: 10, borderRadius: 5 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 13, marginTop: 18 }, noticeText: { flex: 1, fontSize: 11, lineHeight: 16 }, errorText: { marginTop: 12, fontSize: 12, lineHeight: 17 },
  paystackModal: { flex: 1, backgroundColor: '#FFFFFF' }, paystackHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth }, paystackTitle: { fontSize: 15, fontWeight: '800' }, modalClose: { width: 38, height: 38, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, webViewLoading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth }, footerTotal: { minWidth: 84 }, footerLabel: { fontSize: 10 }, footerAmount: { marginTop: 3, fontSize: 16, fontWeight: '800' }, continueButton: { minHeight: 50, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 14 }, continueText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, pressed: { opacity: 0.82 }, disabled: { opacity: 0.6 },
});
