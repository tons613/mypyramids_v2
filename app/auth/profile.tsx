import { AuthSignOutButton } from '@/components/ui/AuthSignOutButton';
import { LoginRequiredGate } from '@/components/ui/LoginRequiredGate';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { GradientButton } from '@/components/ui/GradientButton';
import { OutlinedField } from '@/components/ui/OutlinedField';
import { auth } from '@/config/firebase';
import { Colors } from '@/constants/theme';
import { useAuthTheme } from '@/hooks/use-auth-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/endpoints';
import { getApiErrorMessage } from '@/services/apiResponse';
import { loginSuccess } from '@/store/authSlice';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text as NativeText, View, Image } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store';

function parseDob(value?: string | null) {
  if (!value) return new Date(2000, 0, 1);
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return new Date(2000, 0, 1);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? new Date(2000, 0, 1) : parsed;
}

function formatDobForApi(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDobForDisplay(value: string) {
  if (!value) return '';
  return parseDob(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function ProfileContent() {
  const params = useLocalSearchParams();
  const sessionUser = useSelector((state: RootState) => state.auth.user);
  const sessionToken = useSelector((state: RootState) => state.auth.token);
  const role = String(params.role || sessionUser?.role || 'patient');
  const isProvider = role === 'provider';

  const [firstname, setFirstname] = useState(sessionUser?.firstname || '');
  const [lastname, setLastname] = useState(sessionUser?.lastname || '');
  const [gender, setGender] = useState(sessionUser?.gender || '');
  const [address, setAddress] = useState(sessionUser?.address || '');
  const [dob, setDob] = useState(sessionUser?.dob?.slice(0, 10) || '');
  const [dobPickerDate, setDobPickerDate] = useState(() => parseDob(sessionUser?.dob));
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [stateName, setStateName] = useState(sessionUser?.state || '');
  const [title, setTitle] = useState(sessionUser?.title || sessionUser?.doc_profile?.title || '');
  const [institution, setInstitution] = useState(sessionUser?.institution || sessionUser?.doc_profile?.institution || '');
  const [institutionAddress, setInstitutionAddress] = useState(sessionUser?.institution_address || sessionUser?.doc_profile?.institution_address || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const authTheme = useAuthTheme();

  const handleDobChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDobPicker(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    setDobPickerDate(selectedDate);
    setDob(formatDobForApi(selectedDate));
  };

  const handleSave = async () => {
    if (!firstname.trim() || !lastname.trim() || !gender || !address.trim() || !dob.trim() || !stateName.trim()) {
      setError('Complete each required field to continue.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
      setError('Enter your date of birth as YYYY-MM-DD.');
      return;
    }
    if (isProvider && (!title.trim() || !institution.trim() || !institutionAddress.trim())) {
      setError('Complete your professional title and institution details to continue.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const activeToken = await auth.currentUser?.getIdToken(true) || sessionToken;
      if (!activeToken) throw new Error('Your sign-in session expired. Please sign in again.');

      const commonData = {
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        gender,
        address: address.trim(),
        dob: dob.trim(),
        state: stateName.trim(),
      };

      const response = isProvider
        ? await authService.updateProviderProfile({
            ...commonData,
            title: title.trim(),
            institution: institution.trim(),
            institution_address: institutionAddress.trim(),
            profession: String(params.profession || sessionUser?.profession || sessionUser?.doc_profile?.profession || ''),
          }, activeToken)
        : await authService.updateProfile(commonData, activeToken);

      const completedUser = {
        ...(sessionUser || {}),
        ...response,
        id: response?.id ?? sessionUser?.id ?? 0,
        uid: response?.uid || sessionUser?.uid || auth.currentUser?.uid || '',
        email: response?.email || sessionUser?.email || String(params.email || ''),
        phone: response?.phone || sessionUser?.phone || String(params.phone || ''),
        role: response?.role || role,
        ...commonData,
        phone_verified: response?.phone_verified ?? sessionUser?.phone_verified ?? true,
        status: response?.status ?? 1,
        ...(isProvider ? {
          title: title.trim(),
          institution: institution.trim(),
          institution_address: institutionAddress.trim(),
          profession: String(params.profession || sessionUser?.profession || sessionUser?.doc_profile?.profession || ''),
        } : {}),
      };

      dispatch(loginSuccess({ user: completedUser, token: activeToken }));
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not save your profile. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: authTheme.screenBg }]}>
      <Image source={require('@/assets/images/banners/login.jpeg')} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[styles.backgroundTint, { backgroundColor: authTheme.overlay }]} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <BrandHeader />
            <View style={styles.header}>
              <Text variant="headlineMedium" style={[styles.heading, { color: authTheme.heading }]}>Complete your <Text style={[styles.headingAccent, { color: theme.primary }]}>profile</Text></Text>
              <View style={[styles.rule, { backgroundColor: theme.primary }]} />
              <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.muted }]}>A few details help us personalize your care.</Text>
            </View>

            <View style={[styles.form, { backgroundColor: authTheme.surfaceGlass, borderColor: theme.border }]}>
              <OutlinedField label="First name" icon="person-outline" value={firstname} onChangeText={setFirstname} placeholder="Enter your first name" autoCapitalize="words" />
              <OutlinedField label="Last name" icon="person-outline" value={lastname} onChangeText={setLastname} placeholder="Enter your last name" autoCapitalize="words" />

              <NativeText style={[styles.fieldLabel, { color: authTheme.accentDeep }]}>Gender</NativeText>
              <View style={styles.genderOptions}>
                {(['Male', 'Female'] as const).map((option) => {
                  const selected = gender === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setGender(option)}
                      style={[
                        styles.genderOption,
                        { backgroundColor: authTheme.fieldBg, borderColor: authTheme.fieldBorder },
                        selected && { backgroundColor: authTheme.selectionBg, borderColor: authTheme.selectionBg },
                      ]}
                    >
                      <Ionicons
                        name={option === 'Male' ? 'male-outline' : 'female-outline'}
                        size={18}
                        color={selected ? authTheme.onSelection : authTheme.accent}
                      />
                      <NativeText style={[styles.genderOptionText, { color: selected ? authTheme.onSelection : authTheme.accentDeep }]}>{option}</NativeText>
                    </Pressable>
                  );
                })}
              </View>

              {Platform.OS === 'web' ? (
                <OutlinedField label="Date of birth (YYYY-MM-DD)" icon="calendar-outline" value={dob} onChangeText={setDob} placeholder="1995-04-21" keyboardType="numbers-and-punctuation" />
              ) : (
                <View style={styles.dateFieldWrap}>
                  <NativeText style={[styles.authFieldLabel, { color: authTheme.accentDeep }]}>Date of birth</NativeText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose date of birth"
                    onPress={() => {
                      setDobPickerDate(parseDob(dob));
                      setShowDobPicker(true);
                    }}
                    style={({ pressed }) => [
                      styles.dateField,
                      { backgroundColor: authTheme.fieldBg, borderColor: authTheme.fieldBorder },
                      pressed && styles.fieldPressed,
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={18} color={authTheme.accent} />
                    <NativeText style={[styles.dateValue, { color: dob ? authTheme.heading : authTheme.placeholder }]}>
                      {dob ? formatDobForDisplay(dob) : 'Select your date of birth'}
                    </NativeText>
                    <Ionicons name="chevron-down" size={16} color={authTheme.accent} />
                  </Pressable>
                </View>
              )}
              {showDobPicker && Platform.OS !== 'web' ? (
                <View style={[styles.datePicker, { backgroundColor: authTheme.surface, borderColor: theme.border }]}>
                  <DateTimePicker
                    value={dobPickerDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date(1900, 0, 1)}
                    maximumDate={new Date()}
                    onChange={handleDobChange}
                    accentColor={theme.primary}
                  />
                  {Platform.OS === 'ios' ? (
                    <Button mode="text" onPress={() => setShowDobPicker(false)} textColor={theme.primary}>Done</Button>
                  ) : null}
                </View>
              ) : null}

              <OutlinedField label="Residential address" icon="location-outline" value={address} onChangeText={setAddress} placeholder="Enter your residential address" />
              <OutlinedField label="State of residence" icon="map-outline" value={stateName} onChangeText={setStateName} placeholder="Enter your state" autoCapitalize="words" />

              {isProvider ? (
                <>
                  <View style={styles.sectionHeading}>
                    <Ionicons name="medkit-outline" size={19} color={theme.primary} />
                    <Text variant="titleMedium" style={[styles.providerHeading, { color: theme.primary }]}>Professional details</Text>
                  </View>
                  <OutlinedField label="Professional title" icon="ribbon-outline" value={title} onChangeText={setTitle} placeholder="Dr, Nurse, Scientist..." />
                  <OutlinedField label="Institution" icon="business-outline" value={institution} onChangeText={setInstitution} placeholder="Enter your institution" />
                  <OutlinedField label="Institution address" icon="location-outline" value={institutionAddress} onChangeText={setInstitutionAddress} placeholder="Enter the institution address" />
                </>
              ) : null}

              {error ? <HelperText type="error" visible>{error}</HelperText> : null}
              <GradientButton label="Save and continue" onPress={handleSave} loading={loading} disabled={loading} />
            </View>
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: authTheme.surfaceGlass }]}>
            <Text style={[styles.footerHint, { color: theme.muted }]}>You can sign back in and continue later</Text>
            <AuthSignOutButton />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export default function ProfileScreen() {
  return <LoginRequiredGate><ProfileContent /></LoginRequiredGate>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundTint: { ...StyleSheet.absoluteFill },
  safeArea: { flex: 1 },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 4, paddingBottom: 28 },
  header: { alignItems: 'center', marginBottom: 22 },
  heading: { fontWeight: '800', textAlign: 'center' },
  headingAccent: { fontWeight: '800' },
  rule: { width: 56, height: 4, borderRadius: 4, marginTop: 10, marginBottom: 10 },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  form: { borderWidth: 1, borderRadius: 26, padding: 18, shadowColor: '#4C1D95', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  fieldLabel: { fontSize: 14, marginBottom: 6, fontWeight: '600' },
  genderOptions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  genderOption: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14 },
  genderOptionText: { fontSize: 15, fontWeight: '600' },
  dateFieldWrap: { marginBottom: 14 },
  authFieldLabel: { fontSize: 14, marginBottom: 6, fontWeight: '500' },
  dateField: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14 },
  dateValue: { flex: 1, fontSize: 15 },
  fieldPressed: { opacity: 0.78 },
  datePicker: { marginBottom: 14, borderWidth: 1, borderRadius: 16, padding: 8, overflow: 'hidden' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 14 },
  providerHeading: { fontWeight: '700' },
  footer: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footerHint: { flex: 1, fontSize: 12, lineHeight: 17 },
});
