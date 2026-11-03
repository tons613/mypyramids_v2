import { LoginRequiredGate } from '@/components/ui/LoginRequiredGate';
import { Colors } from '@/constants/theme';
import { naira } from '@/constants/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RootState } from '@/store';
import { AppDispatch } from '@/store';
import { clearOrderRecipient, setOrderRecipient, type NewOrderPatient } from '@/store/checkoutSlice';
import { authService } from '@/services/endpoints';
import { getApiErrorMessage } from '@/services/apiResponse';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

type CollectionType = 'center' | 'home';

function parsePatientDob(value: string) {
  if (!value) return new Date(2000, 0, 1);
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date(2000, 0, 1);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? new Date(2000, 0, 1) : date;
}

function formatPatientDob(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function CheckoutContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, total } = useSelector((state: RootState) => state.cart);
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch<AppDispatch>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [clinicalInfo, setClinicalInfo] = useState('');
  const [collectionType, setCollectionType] = useState<CollectionType>('center');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [addressError, setAddressError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showClinicalNotes, setShowClinicalNotes] = useState(false);
  const isProvider = user?.role?.toLowerCase() === 'provider';
  const [recipientMode, setRecipientMode] = useState<'self' | 'patient'>('self');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientLookup, setPatientLookup] = useState<'idle' | 'loading' | 'found' | 'new' | 'error'>('idle');
  const [patientLookupError, setPatientLookupError] = useState('');
  const [patientRecord, setPatientRecord] = useState<Record<string, unknown> | null>(null);
  const [patientFirstName, setPatientFirstName] = useState('');
  const [patientLastName, setPatientLastName] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [patientDobPickerDate, setPatientDobPickerDate] = useState(() => parsePatientDob(''));
  const [showPatientDobPicker, setShowPatientDobPicker] = useState(false);
  const [patientEmail, setPatientEmail] = useState('');
  const [patientGender, setPatientGender] = useState('');

  useEffect(() => { dispatch(clearOrderRecipient()); }, [dispatch]);

  const logisticsFee = collectionType === 'home' ? 1500 : 0;
  const finalTotal = total + logisticsFee;
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleBack = () => router.canGoBack() ? router.back() : router.replace('/order/cart');

  const findPatientByPhone = async () => {
    const phone = patientPhone.trim();
    if (!phone) {
      setPatientLookupError('Enter the patient’s phone number.');
      setPatientLookup('error');
      return;
    }
    setPatientLookup('loading');
    setPatientLookupError('');
    setPatientRecord(null);
    try {
      const result = await authService.getUserByPhone(phone);
      const record = result && typeof result === 'object' ? result as Record<string, unknown> : null;
      if (!record || String(record.role ?? '').toLowerCase() !== 'patient' || !Number(record.id)) {
        setPatientLookup('error');
        setPatientLookupError('That phone number is not linked to a patient account. Check the number or use the patient’s registered phone.');
        return;
      }
      setPatientRecord(record);
      setPatientLookup('found');
    } catch (lookupError) {
      const status = (lookupError as { status?: number; response?: { status?: number } })?.status ?? (lookupError as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setPatientLookup('new');
        setPatientLookupError('No patient account was found. Enter their basic details to continue.');
        return;
      }
      // A lookup error must not leave a stale patient eligible for checkout.
      setPatientLookup('error');
      setPatientLookupError(getApiErrorMessage(lookupError, 'We could not check that phone number. Try again.'));
    }
  };

  const handlePatientDobChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPatientDobPicker(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    setPatientDobPickerDate(selectedDate);
    setPatientDob(formatPatientDob(selectedDate));
  };

  const continueToPayment = () => {
    if (items.length === 0 || loading) return;
    if (collectionType === 'home' && (!address.trim() || !landmark.trim())) {
      setAddressError(true);
      return;
    }
    if (isProvider && recipientMode === 'patient') {
      if (patientLookup === 'found' && patientRecord && Number(patientRecord.id)) {
        const patientName = [patientRecord.firstname, patientRecord.lastname].filter(Boolean).join(' ') || 'Patient';
        dispatch(setOrderRecipient({ type: 'existing', patient_id: Number(patientRecord.id), patientName }));
      } else if (patientLookup === 'new') {
        const dob = patientDob.trim();
        const dobDate = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? new Date(`${dob}T00:00:00Z`) : null;
        const validDob = dobDate && !Number.isNaN(dobDate.getTime()) && dobDate.toISOString().slice(0, 10) === dob;
        if (!patientFirstName.trim() || !patientLastName.trim() || !validDob || !patientGender) {
          setPatientLookupError('Enter the patient’s first name, last name, date of birth (YYYY-MM-DD) and gender.');
          return;
        }
        const patient: NewOrderPatient = {
          firstname: patientFirstName.trim(),
          lastname: patientLastName.trim(),
          phone: patientPhone.trim(),
          dob,
          ...(patientEmail.trim() ? { email: patientEmail.trim() } : {}),
          gender: patientGender,
          role: 'patient',
        };
        dispatch(setOrderRecipient({ type: 'new', patient, patientName: `${patient.firstname} ${patient.lastname}` }));
      } else {
        setPatientLookupError('Look up the patient by phone number before continuing.');
        if (patientLookup === 'idle') setPatientLookup('error');
        return;
      }
    } else {
      dispatch(setOrderRecipient({ type: 'self' }));
    }
    setAddressError(false);
    setLoading(true);
    router.push({
      pathname: '/order/payment',
      params: {
        amount: String(finalTotal),
        collectionType,
        address: collectionType === 'home' ? address.trim() : '',
        landmark: collectionType === 'home' ? landmark.trim() : '',
        clinicalInfo: clinicalInfo.trim(),
        quantity: String(quantity),
      },
    });
    setLoading(false);
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}><Ionicons name="cart-outline" size={28} color={colors.primary} /></View>
          <Text style={[styles.emptyTitle, { color: colors.navy }]}>Your cart is empty</Text>
          <Text style={[styles.emptyCopy, { color: colors.muted }]}>Add a test or package before continuing to checkout.</Text>
          <Pressable onPress={() => router.replace('/order')} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.primaryButtonText}>Browse tests</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F8FAFC' }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to cart" onPress={handleBack} style={[styles.backButton, { borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={21} color={colors.navy} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.headerTitle, { color: colors.navy }]}>Collection details</Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>Choose where to provide your sample</Text>
          </View>
          <View style={[styles.stepBadge, { backgroundColor: colors.accent }]}><Text style={[styles.stepBadgeText, { color: colors.primary }]}>1 of 3</Text></View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>Sample collection</Text>
            <Text style={[styles.sectionHint, { color: colors.muted }]}>Choose where you’ll provide your sample</Text>
          </View>
          {isProvider ? (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.navy }]}>Who is this order for?</Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>Choose yourself or a patient you’re ordering for.</Text>
              <View style={styles.recipientChoices}>
                {(['self', 'patient'] as const).map((mode) => {
                  const selected = recipientMode === mode;
                  return <Pressable key={mode} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => { setRecipientMode(mode); setPatientLookup('idle'); setPatientRecord(null); setPatientLookupError(''); }} style={[styles.recipientChoice, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.accent : colors.card }]}>
                    <Ionicons name={mode === 'self' ? 'person-outline' : 'people-outline'} size={17} color={colors.primary} />
                    <Text style={[styles.recipientChoiceText, { color: colors.navy }]}>{mode === 'self' ? 'Myself' : 'A patient'}</Text>
                  </Pressable>;
                })}
              </View>
              {recipientMode === 'patient' ? <>
                <Text style={[styles.fieldLabel, { color: colors.navy }]}>Patient phone number</Text>
                <View style={styles.lookupRow}>
                  <TextInput accessibilityLabel="Patient phone number" value={patientPhone} onChangeText={(value) => { setPatientPhone(value); setPatientLookup('idle'); setPatientRecord(null); setPatientLookupError(''); }} placeholder="Enter phone number" placeholderTextColor={colors.muted} keyboardType="phone-pad" style={[styles.textInput, styles.lookupInput, { color: colors.navy, backgroundColor: colors.lavender, borderColor: colors.border }]} />
                  <Pressable accessibilityRole="button" disabled={patientLookup === 'loading'} onPress={() => void findPatientByPhone()} style={[styles.lookupButton, { backgroundColor: colors.primary }, patientLookup === 'loading' && styles.disabled]}>
                    {patientLookup === 'loading' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.lookupButtonText}>Find</Text>}
                  </Pressable>
                </View>
                {patientLookupError ? <Text style={[styles.errorText, { color: patientLookup === 'error' ? colors.error : colors.muted }]}>{patientLookupError}</Text> : null}
                {patientLookup === 'found' && patientRecord ? <View style={[styles.patientFound, { backgroundColor: colors.accent }]}>
                  <Ionicons name="checkmark-circle" size={19} color={colors.primary} />
                  <View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.navy }]}>{[patientRecord.firstname, patientRecord.lastname].filter((part) => typeof part === 'string' && part.trim()).join(' ') || 'Patient account found'}</Text><Text style={[styles.cardSubtitle, { color: colors.muted }]}>{String(patientRecord.phone ?? patientPhone)}</Text></View>
                </View> : null}
                {patientLookup === 'new' ? <View style={styles.newPatientFields}>
                  <TextInput accessibilityLabel="Patient first name" value={patientFirstName} onChangeText={setPatientFirstName} placeholder="First name" placeholderTextColor={colors.muted} style={[styles.textInput, { color: colors.navy, backgroundColor: colors.lavender, borderColor: colors.border }]} />
                  <TextInput accessibilityLabel="Patient last name" value={patientLastName} onChangeText={setPatientLastName} placeholder="Last name" placeholderTextColor={colors.muted} style={[styles.textInput, { color: colors.navy, backgroundColor: colors.lavender, borderColor: colors.border }]} />
                  <Text style={[styles.fieldLabel, { color: colors.navy }]}>Date of birth</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose patient date of birth"
                    onPress={() => {
                      setPatientDobPickerDate(parsePatientDob(patientDob));
                      setShowPatientDobPicker(true);
                    }}
                    style={[styles.dobField, { backgroundColor: colors.lavender, borderColor: colors.border }]}
                  >
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={[styles.dobValue, { color: patientDob ? colors.navy : colors.muted }]}>
                      {patientDob ? parsePatientDob(patientDob).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Select date of birth'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.primary} />
                  </Pressable>
                  {showPatientDobPicker ? <View style={[styles.dobPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <DateTimePicker
                      value={patientDobPickerDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={new Date(1900, 0, 1)}
                      maximumDate={new Date()}
                      onChange={handlePatientDobChange}
                      accentColor={colors.primary}
                    />
                    {Platform.OS === 'ios' ? <Pressable accessibilityRole="button" onPress={() => setShowPatientDobPicker(false)} style={styles.dobDone}>
                      <Text style={[styles.dobDoneText, { color: colors.primary }]}>Done</Text>
                    </Pressable> : null}
                  </View> : null}
                  <TextInput accessibilityLabel="Patient email (optional)" value={patientEmail} onChangeText={setPatientEmail} placeholder="Email (optional)" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" style={[styles.textInput, { color: colors.navy, backgroundColor: colors.lavender, borderColor: colors.border }]} />
                  <Text style={[styles.fieldLabel, { color: colors.navy }]}>Gender</Text>
                  <View style={styles.recipientChoices}>{['Male', 'Female'].map((gender) => <Pressable key={gender} accessibilityRole="radio" accessibilityState={{ checked: patientGender === gender }} onPress={() => setPatientGender(gender)} style={[styles.genderChoice, { borderColor: patientGender === gender ? colors.primary : colors.border, backgroundColor: patientGender === gender ? colors.accent : colors.card }]}><Text style={[styles.recipientChoiceText, { color: colors.navy }]}>{gender}</Text></Pressable>)}</View>
                </View> : null}
              </> : null}
            </View>
          ) : null}
          <View style={[styles.collectionList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CollectionOption
              title="At a collection centre"
              detail="Visit a Pyramids centre"
              price="Free"
              icon="business-outline"
              selected={collectionType === 'center'}
              colors={colors}
              onPress={() => { setCollectionType('center'); setAddressError(false); }}
            />
            <View style={[styles.collectionDivider, { backgroundColor: colors.border }]} />
            <CollectionOption
              title="Home collection"
              detail="We’ll visit your address"
              price="₦1,500"
              icon="home-outline"
              selected={collectionType === 'home'}
              colors={colors}
              onPress={() => setCollectionType('home')}
            />
          </View>

          {collectionType === 'home' ? (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.navy }]}>Where should we come?</Text>
              <TextInput
                accessibilityLabel="Collection address"
                value={address}
                onChangeText={(value) => { setAddress(value); setAddressError(false); }}
                placeholder="Street address, area and city"
                placeholderTextColor={colors.muted}
                multiline
                style={[styles.textInput, styles.addressInput, { color: colors.navy, backgroundColor: colors.lavender, borderColor: addressError && !address.trim() ? colors.error : colors.border }]}
              />
              <TextInput
                accessibilityLabel="Nearest landmark"
                value={landmark}
                onChangeText={(value) => { setLandmark(value); setAddressError(false); }}
                placeholder="Nearest landmark"
                placeholderTextColor={colors.muted}
                style={[styles.textInput, { color: colors.navy, backgroundColor: colors.lavender, borderColor: addressError && !landmark.trim() ? colors.error : colors.border }]}
              />
              {addressError ? <Text style={[styles.errorText, { color: colors.error }]}>Add your address and nearest landmark to continue.</Text> : null}
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showClinicalNotes }} onPress={() => setShowClinicalNotes((visible) => !visible)} style={styles.notesToggle}>
              <View style={[styles.notesIcon, { backgroundColor: colors.accent }]}><Ionicons name="document-text-outline" size={17} color={colors.primary} /></View>
              <View style={styles.notesCopy}><Text style={[styles.cardTitle, { color: colors.navy }]}>Add clinical notes</Text><Text style={[styles.cardSubtitle, { color: colors.muted }]}>Optional</Text></View>
              <Ionicons name={showClinicalNotes ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </Pressable>
            {showClinicalNotes ? <TextInput
              accessibilityLabel="Optional clinical notes"
              value={clinicalInfo}
              onChangeText={setClinicalInfo}
              placeholder="Symptoms or instructions from your doctor"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              style={[styles.textInput, styles.notesInput, { color: colors.navy, backgroundColor: colors.lavender, borderColor: colors.border }]}
            /> : null}
          </View>

          <View style={styles.contactNote}>
            <Ionicons name="person-circle-outline" size={18} color={colors.muted} />
            <Text style={[styles.contactText, { color: colors.muted }]}>{user?.email || user?.phone || 'Your account details'} will be used for your order updates.</Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.footerTotal}>
            <Text style={[styles.footerLabel, { color: colors.muted }]}>Total · {logisticsFee ? 'includes collection' : 'collection free'}</Text>
            <Text style={[styles.footerAmount, { color: colors.navy }]}>{naira(finalTotal)}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading }} disabled={loading} onPress={continueToPayment} style={({ pressed }) => [styles.primaryButton, styles.footerButton, { backgroundColor: colors.primary }, pressed && styles.pressed, loading && styles.disabled]}>
            <Text style={styles.primaryButtonText}>{loading ? 'Opening payment…' : 'Continue to payment'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CollectionOption({ title, detail, price, icon, selected, colors, onPress }: {
  title: string; detail: string; price: string; icon: React.ComponentProps<typeof Ionicons>['name']; selected: boolean;
  colors: typeof Colors.light; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.collectionOption, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }]}>
      <View style={[styles.collectionIcon, { backgroundColor: colors.accent }]}><Ionicons name={icon} size={20} color={colors.primary} /></View>
      <View style={styles.collectionCopy}>
        <Text numberOfLines={1} style={[styles.collectionTitle, { color: colors.navy }]}>{title}</Text>
        <Text numberOfLines={2} style={[styles.collectionDetail, { color: colors.muted }]}>{detail}</Text>
        <Text style={[styles.collectionPrice, { color: colors.primary }]}>{price}</Text>
      </View>
      <View style={[styles.radioOuter, { borderColor: selected ? colors.primary : colors.border }]}>{selected ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}</View>
    </Pressable>
  );
}

export default function CheckoutScreen() {
  return <LoginRequiredGate><CheckoutContent /></LoginRequiredGate>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  keyboard: { flex: 1 },
  header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 19, fontWeight: '800' },
  headerSubtitle: { marginTop: 3, fontSize: 11 },
  stepBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  stepBadgeText: { fontSize: 11, fontWeight: '800' },
  scrollContent: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24, gap: 13 },
  sectionHeading: { marginBottom: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionHint: { marginTop: 4, fontSize: 12, lineHeight: 17 },
  collectionList: { borderWidth: 1, borderRadius: 17, paddingVertical: 3 },
  collectionDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  collectionOption: { minHeight: 73, flexDirection: 'row', alignItems: 'center', gap: 11, marginHorizontal: 8, marginVertical: 6, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 13, borderWidth: 1 },
  collectionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  collectionCopy: { flex: 1, justifyContent: 'center' },
  collectionTitle: { fontSize: 12, fontWeight: '800' },
  collectionDetail: { marginTop: 3, fontSize: 10, lineHeight: 14 },
  collectionPrice: { marginTop: 3, fontSize: 10, fontWeight: '800' },
  radioOuter: { width: 18, height: 18, borderWidth: 1.5, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 9, height: 9, borderRadius: 5 },
  card: { padding: 14, borderWidth: 1, borderRadius: 16 },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  cardSubtitle: { marginTop: 3, fontSize: 11 },
  recipientChoices: { flexDirection: 'row', gap: 9, marginTop: 12 },
  recipientChoice: { minHeight: 42, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 12 },
  recipientChoiceText: { fontSize: 12, fontWeight: '700' },
  fieldLabel: { marginTop: 12, marginBottom: 6, fontSize: 11, fontWeight: '700' },
  lookupRow: { flexDirection: 'row', gap: 8 },
  lookupInput: { flex: 1 },
  lookupButton: { minWidth: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 13 },
  lookupButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  patientFound: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 11, padding: 11, borderRadius: 12 },
  newPatientFields: { gap: 8, marginTop: 10 },
  genderChoice: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 11 },
  dobField: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: 12 },
  dobValue: { flex: 1, fontSize: 12 },
  dobPicker: { borderWidth: 1, borderRadius: 12, padding: 8, overflow: 'hidden' },
  dobDone: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8 },
  dobDoneText: { fontSize: 13, fontWeight: '700' },
  textInput: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderRadius: 12, fontSize: 12 },
  addressInput: { minHeight: 66, textAlignVertical: 'top', marginTop: 12, marginBottom: 9 },
  errorText: { marginTop: 8, fontSize: 11, lineHeight: 16 },
  notesToggle: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10 },
  notesCopy: { flex: 1 },
  notesIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  notesInput: { minHeight: 76, marginTop: 12, textAlignVertical: 'top' },
  contactNote: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 3 },
  contactText: { flex: 1, fontSize: 10, lineHeight: 15 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 11, borderTopWidth: StyleSheet.hairlineWidth },
  footerTotal: { minWidth: 95 },
  footerLabel: { fontSize: 9 },
  footerAmount: { marginTop: 2, fontSize: 16, fontWeight: '800' },
  primaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 16, borderRadius: 14 },
  footerButton: { flex: 1 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyIcon: { width: 64, height: 64, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 19, fontWeight: '800' },
  emptyCopy: { marginTop: 7, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
