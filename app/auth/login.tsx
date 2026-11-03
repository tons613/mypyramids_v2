import { AuthScaffold } from "@/components/ui/AuthScaffold";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { GradientButton } from "@/components/ui/GradientButton";
import { OutlinedField } from "@/components/ui/OutlinedField";
import { SocialAuthRow } from "@/components/ui/SocialAuthRow";
import { auth } from "@/config/firebase";
import { useAuthTheme } from "@/hooks/use-auth-theme";
import { getApiErrorMessage } from "@/services/apiResponse";
import { authService } from "@/services/endpoints";
import { loginFailure, loginStart, loginSuccess } from "@/store/authSlice";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link } from "expo-router";
import {
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useDispatch } from "react-redux";

const firebaseAuth = auth;

const REMEMBER_KEY = "rememberedLogin";

export default function LoginScreen() {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dispatch = useDispatch();
  const theme = useAuthTheme();

  useEffect(() => {
    AsyncStorage.getItem(REMEMBER_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as {
          mode: "email" | "phone";
          value: string;
        };
        setMode(saved.mode);
        setRemember(true);
        if (saved.mode === "email") setEmail(saved.value);
        else setPhone(saved.value);
      })
      .catch(() => {});
  }, []);

  const handleLogin = async () => {
    setError("");
    if (!password || (mode === "email" ? !email : !phone)) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    dispatch(loginStart());

    try {
      let loginEmail = email.trim();
      if (mode === "phone") {
        const lookup = await authService.loginWithPhone(phone.trim());
        loginEmail = typeof lookup === "string" ? lookup : lookup?.email;
        if (!loginEmail)
          throw new Error("No account found for that phone number");
      }

      const userCredential = await signInWithEmailAndPassword(
        firebaseAuth,
        loginEmail,
        password,
      );
      const token = await userCredential.user.getIdToken(true);
      const profile = await authService.getProfile(token);
      console.log(profile);
      const authenticatedUser = {
        ...profile,
        id: profile?.id ?? 0,
        uid: profile?.uid || userCredential.user.uid,
        email: profile?.email || userCredential.user.email || loginEmail,
        phone: profile?.phone || phone.trim(),
        role: profile?.role || "patient",
        profession: profile?.profession || profile?.doc_profile?.profession,
      };
      dispatch(loginSuccess({ user: authenticatedUser, token }));

      if (remember) {
        await AsyncStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({
            mode,
            value: mode === "email" ? email.trim() : phone.trim(),
          }),
        );
      } else {
        await AsyncStorage.removeItem(REMEMBER_KEY);
      }
    } catch (err: any) {
      await firebaseSignOut(firebaseAuth).catch(() => {});
      setLoading(false);
      const errorMessage = getApiErrorMessage(err, "Invalid credentials");
      setError(errorMessage);
      dispatch(loginFailure(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold>
      <BrandHeader />
      <Text style={[styles.title, { color: theme.heading }]}>Welcome back!</Text>
      <Text style={[styles.subtitle, { color: theme.body }]}>
        Login to manage your diagnostics{"\n"}with ease and confidence.
      </Text>

      <View style={styles.tabs}>
        <Pressable style={styles.tab} onPress={() => setMode("email")}>
          <Ionicons
            name="mail-outline"
            size={16}
            color={mode === "email" ? theme.accent : theme.muted}
          />
          <Text style={[styles.tabText, { color: mode === "email" ? theme.accent : theme.muted }]}>
            Login with Email
          </Text>
          <View
            style={[styles.underline, mode === "email" && { backgroundColor: theme.accent }]}
          />
        </Pressable>
        <Pressable style={styles.tab} onPress={() => setMode("phone")}>
          <Ionicons
            name="call-outline"
            size={16}
            color={mode === "phone" ? theme.accent : theme.muted}
          />
          <Text style={[styles.tabText, { color: mode === "phone" ? theme.accent : theme.muted }]}>
            Login with Phone
          </Text>
          <View
            style={[styles.underline, mode === "phone" && { backgroundColor: theme.accent }]}
          />
        </Pressable>
      </View>

      {mode === "email" ? (
        <OutlinedField
          label="Email:"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email address"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      ) : (
        <OutlinedField
          label="Phone number:"
          icon="call-outline"
          value={phone}
          onChangeText={setPhone}
          placeholder="080********"
          keyboardType="phone-pad"
        />
      )}
      <OutlinedField
        label="Password:"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        isPassword
      />

      <View style={styles.row}>
        <Pressable
          style={styles.remember}
          onPress={() => setRemember((v) => !v)}
        >
          <Ionicons
            name={remember ? "checkbox" : "square-outline"}
            size={20}
            color={theme.accent}
          />
          <Text style={[styles.rememberText, { color: theme.body }]}>Remember me</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            Alert.alert(
              "Forgot password",
              "Password reset is not available yet.",
            )
          }
        >
          <Text style={[styles.forgot, { color: theme.link }]}>Forgot your password?</Text>
        </Pressable>
      </View>

      {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}

      <GradientButton label="Sign In" onPress={handleLogin} loading={loading} />

      <View style={styles.footer}>
        <View style={[styles.line, { backgroundColor: theme.divider }]} />
        <Text style={[styles.footerText, { color: theme.muted }]}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/category" style={[styles.link, { color: theme.link }]}>
            Sign Up
          </Link>
        </Text>
        <View style={[styles.line, { backgroundColor: theme.divider }]} />
      </View>
      <SocialAuthRow />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 22,
    lineHeight: 20,
  },
  tabs: { flexDirection: "row", marginBottom: 18 },
  tab: { flex: 1, alignItems: "center", gap: 6, paddingBottom: 8 },
  tabText: { fontWeight: "600", fontSize: 13 },
  underline: {
    height: 2,
    alignSelf: "stretch",
    backgroundColor: "transparent",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  remember: { flexDirection: "row", alignItems: "center", gap: 6 },
  rememberText: { fontSize: 13 },
  forgot: { fontSize: 13 },
  error: { marginBottom: 10, textAlign: "center" },
  footer: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 22 },
  line: { flex: 1, height: 1 },
  footerText: { fontSize: 13 },
  link: { fontWeight: "700" },
});
