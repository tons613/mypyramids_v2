import { OutlinedField } from "@/components/ui/OutlinedField";
import { AuthSignOutButton } from "@/components/ui/AuthSignOutButton";
import { auth, firebaseConfig } from "@/config/firebase";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { authService } from "@/services/endpoints";
import { getApiErrorMessage } from "@/services/apiResponse";
import { getAuthDestination, loginSuccess } from "@/store/authSlice";
import * as Device from "expo-device";
import {
  linkWithPhoneNumber,
  unlink,
  type ConfirmationResult,
} from "firebase/auth";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { OtpInput } from "react-native-otp-entry";
import { Button, HelperText, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store";

const RESEND_COOLDOWN_SECONDS = 60;
// Keep this toggle enabled for local simulator work; __DEV__ and Device.isDevice
// prevent the test code from being accepted in production or on physical phones.
const DEV_SIMULATOR_VERIFICATION_ENABLED = true;
const DEV_SIMULATOR_VERIFICATION_CODE = "123456";
const useSimulatorVerification =
  __DEV__ && DEV_SIMULATOR_VERIFICATION_ENABLED && Platform.OS !== "web" && !Device.isDevice;

function toE164(phone: string) {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("0")) return `+234${trimmed.slice(1)}`;
  return `+234${trimmed}`;
}

function getPhoneAuthError(error: any) {
  switch (error?.code) {
    case "auth/invalid-phone-number":
      return "That phone number is invalid. Check it and try again.";
    case "auth/too-many-requests":
      return "Too many code requests. Please wait before trying again.";
    case "auth/invalid-verification-code":
      return "That code is incorrect. Check the SMS and try again.";
    case "auth/code-expired":
    case "auth/session-expired":
      return "That code has expired. Request a new one and try again.";
    case "auth/credential-already-in-use":
      return "That phone number is already linked to another account.";
    default:
      return getApiErrorMessage(error, "Phone verification failed. Please try again.");
  }
}

export default function VerifyScreen() {
  const params = useLocalSearchParams();
  const initialPhone = typeof params.phone === "string" ? params.phone : "";
  const [phone, setPhone] = useState(initialPhone);
  const [phoneDraft, setPhoneDraft] = useState(initialPhone);
  const [editingPhone, setEditingPhone] = useState(false);
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [codeRequested, setCodeRequested] = useState(false);
  const [firebasePhoneVerified, setFirebasePhoneVerified] = useState(false);
  const [otpKey, setOtpKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const captchaRef = useRef<any>(null);
  const initialSendStarted = useRef(false);

  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendVerification = async (targetPhone = phone) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Your sign-in session has expired. Sign in again before verifying your phone.");
      return false;
    }

    let formattedPhone: string;
    try {
      formattedPhone = toE164(targetPhone);
      if (!/^\+234\d{10}$/.test(formattedPhone)) throw new Error("invalid phone");
    } catch {
      setError("Enter a valid Nigerian phone number, such as 08012345678.");
      return false;
    }

    setSending(true);
    setError("");
    setMessage("");
    try {
      if (useSimulatorVerification) {
        setConfirmation(null);
        setCodeRequested(true);
        setFirebasePhoneVerified(false);
        setPhone(formattedPhone);
        setPhoneDraft(formattedPhone);
        setCode("");
        setOtpKey((key) => key + 1);
        setMessage(`Simulator mode: enter ${DEV_SIMULATOR_VERIFICATION_CODE} to continue.`);
        setCooldown(RESEND_COOLDOWN_SECONDS);
        setEditingPhone(false);
        return true;
      }

      if (firebasePhoneVerified && formattedPhone !== phone && currentUser.phoneNumber) {
        await unlink(currentUser, "phone");
        setFirebasePhoneVerified(false);
      }
      if (!captchaRef.current) throw new Error("Verification check is still loading. Please try again.");
      const result = await linkWithPhoneNumber(currentUser, formattedPhone, captchaRef.current);
      setConfirmation(result);
      setCodeRequested(true);
      setFirebasePhoneVerified(false);
      setPhone(formattedPhone);
      setPhoneDraft(formattedPhone);
      setCode("");
      setOtpKey((key) => key + 1);
      setMessage(`Verification code sent to ${formattedPhone}`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setEditingPhone(false);
      return true;
    } catch (sendError: any) {
      setConfirmation(null);
      setCodeRequested(false);
      setError(getPhoneAuthError(sendError));
      captchaRef.current?.reset?.();
      return false;
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (initialSendStarted.current || !initialPhone) return;
    initialSendStarted.current = true;
    void sendVerification(initialPhone);
  }, [initialPhone]);

  const confirmCode = async () => {
    if (!codeRequested) {
      setError("Request a verification code before continuing.");
      return;
    }
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Your sign-in session has expired. Sign in again.");

      if (useSimulatorVerification) {
        if (code !== DEV_SIMULATOR_VERIFICATION_CODE) {
          setError(`Enter the simulator code ${DEV_SIMULATOR_VERIFICATION_CODE}.`);
          setCode("");
          setOtpKey((key) => key + 1);
          return;
        }
        setFirebasePhoneVerified(true);
      } else if (!firebasePhoneVerified) {
        if (!confirmation) throw new Error("Request a new verification code before continuing.");
        await confirmation.confirm(code);
        setFirebasePhoneVerified(true);
      }

      const idToken = await currentUser.getIdToken(true);
      const profile = await authService.verifyPhone(phone, idToken);

      const verifiedUser = {
          ...user,
          ...profile,
          id: profile?.id ?? user?.id ?? 0,
          uid: currentUser.uid,
          email: profile?.email || user?.email || currentUser.email || "",
          phone: profile?.phone || phone,
          role: profile?.role || user?.role || String(params.role || "patient"),
          profession: profile?.profession || profile?.doc_profile?.profession || user?.profession || user?.doc_profile?.profession || String(params.profession || ""),
          firstname: profile?.firstname || user?.firstname,
          lastname: profile?.lastname || user?.lastname,
      };
      dispatch(loginSuccess({ user: verifiedUser, token: idToken }));

      const destination = getAuthDestination(verifiedUser);
      if (destination === "/(tabs)") {
        router.replace(destination);
      } else {
        router.replace({
          pathname: destination,
          params: { ...params, phone: profile?.phone || phone },
        });
      }
    } catch (verifyError: any) {
      setError(getPhoneAuthError(verifyError));
      if (verifyError?.code === "auth/invalid-verification-code" || verifyError?.code === "auth/code-expired") {
        setCode("");
        setOtpKey((key) => key + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const savePhoneAndResend = async () => {
    const normalizedPhone = phoneDraft.trim();
    if (!normalizedPhone) {
      setError("Enter a phone number.");
      return;
    }
    if (toE164(normalizedPhone) === phone) {
      setEditingPhone(false);
      return;
    }
    await sendVerification(normalizedPhone);
  };

  const canResend = cooldown === 0 && !sending && !loading;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {!useSimulatorVerification ? (
        <FirebaseRecaptchaVerifierModal
          ref={captchaRef}
          firebaseConfig={firebaseConfig}
          attemptInvisibleVerification
        />
      ) : null}
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.text }]}>Verify Phone</Text>
        </View>

        {editingPhone ? (
          <View style={styles.phoneEdit}>
            <OutlinedField
              label="Phone number"
              icon="call-outline"
              value={phoneDraft}
              onChangeText={setPhoneDraft}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <View style={styles.editActions}>
              <Button mode="text" onPress={() => { setPhoneDraft(phone); setEditingPhone(false); }}>Cancel</Button>
              <Button mode="contained" onPress={savePhoneAndResend} loading={sending} disabled={sending || loading || !phoneDraft.trim()}>Save & Send Code</Button>
            </View>
          </View>
        ) : (
          <View style={styles.phoneDetails}>
            <Text style={[styles.subtitle, { color: theme.icon }]}>
              {codeRequested ? `Enter the 6-digit code sent to ${phone}` : `Sending a verification code to ${phone}...`}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => { setError(""); setEditingPhone(true); }}
              style={({ pressed }) => [styles.changePhoneButton, { backgroundColor: theme.accent }, pressed && styles.pressed]}
              hitSlop={8}
            >
              <Text style={[styles.changePrompt, { color: theme.muted }]}>Wrong number? </Text>
              <Text style={[styles.changeLink, { color: theme.primary }]}>Change</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.otpContainer}>
          <OtpInput
            key={otpKey}
            numberOfDigits={6}
            onTextChange={setCode}
            focusColor={theme.tint}
            theme={{
              pinCodeContainerStyle: { backgroundColor: theme.background, borderColor: theme.icon },
              pinCodeTextStyle: { color: theme.text },
            }}
          />
        </View>

        {error ? <HelperText type="error">{error}</HelperText> : null}
        {message ? <HelperText type="info" style={[styles.message, { color: theme.success }]}>{message}</HelperText> : null}

        <Button mode="contained" onPress={confirmCode} loading={loading} disabled={loading || sending || editingPhone || !codeRequested || code.length !== 6} style={styles.button}>
          Verify & Continue
        </Button>

        <Button
          mode="text"
          onPress={() => firebasePhoneVerified ? confirmCode() : sendVerification()}
          disabled={(!firebasePhoneVerified && !canResend) || editingPhone || sending || loading}
          style={styles.resendButton}
        >
          {sending ? "Sending Code..." : firebasePhoneVerified ? "Retry Phone Verification" : cooldown > 0 ? `Resend Code in 0:${String(cooldown).padStart(2, "0")}` : "Resend Code"}
        </Button>
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.footerHint, { color: theme.icon }]}>You can sign back in and continue later</Text>
          <AuthSignOutButton />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: 24, justifyContent: "center" },
  title: { fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  header: { alignItems: "center", marginBottom: 12 },
  subtitle: { textAlign: "center", marginBottom: 12, lineHeight: 22 },
  phoneDetails: { alignItems: "center", marginBottom: 22 },
  changePhoneButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  changePrompt: { fontSize: 12, fontWeight: "500" },
  changeLink: { fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.72 },
  phoneEdit: { marginBottom: 18 },
  editActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8 },
  otpContainer: { marginBottom: 24 },
  message: {},
  button: { marginTop: 16, paddingVertical: 6 },
  resendButton: { marginTop: 8 },
  footer: { minHeight: 72, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footerHint: { flex: 1, fontSize: 12, lineHeight: 17 },
});
