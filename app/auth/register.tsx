import { AuthScaffold } from '@/components/ui/AuthScaffold';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { GradientButton } from '@/components/ui/GradientButton';
import { OutlinedField } from '@/components/ui/OutlinedField';
import { SocialAuthRow } from '@/components/ui/SocialAuthRow';
import { auth } from '@/config/firebase';
import { useAuthTheme } from '@/hooks/use-auth-theme';
import { authService } from '@/services/endpoints';
import { getApiErrorMessage } from '@/services/apiResponse';
import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '@/store/authSlice';

export default function RegisterScreen() {
  const params = useLocalSearchParams();
  const role = (params.role as string) || 'patient';
  const profession = (params.profession as string) || '';

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const dispatch = useDispatch();
  const theme = useAuthTheme();

  const handleRegister = async () => {
    if (!email || !phone || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!agreed) {
      setError('Please agree to the Terms of Use and Privacy Policy');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const registeredUser = await authService.register({ email, phone, password, role, profession });
      // The verification endpoint requires a Firebase JWT. Sign in immediately
      // after account creation so the API interceptor can attach that token.
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await credential.user.getIdToken(true);
      dispatch(loginSuccess({
        user: {
          ...registeredUser,
          id: registeredUser?.id ?? 0,
          uid: credential.user.uid,
          email: credential.user.email || email.trim(),
          phone: registeredUser?.phone || phone.trim(),
          role: registeredUser?.role || role,
          profession: registeredUser?.profession || profession,
        },
        token,
      }));
      router.replace({ pathname: '/auth/verify', params: { phone, email, role, profession } });
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold showBack>
      <BrandHeader />
      <Text style={[styles.title, { color: theme.heading }]}>
        Create an <Text style={[styles.accent, { color: theme.accent }]}>account</Text>
      </Text>
      <View style={[styles.rule, { backgroundColor: theme.accent }]} />
      <Text style={[styles.subtitle, { color: theme.muted }]}>
        Create an account for free and enjoy great diagnostic and health services at your fingertips
      </Text>

      <OutlinedField label="Email:" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="Enter you email address" autoCapitalize="none" keyboardType="email-address" />
      <OutlinedField label="Phone number:" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="080********" keyboardType="phone-pad" />
      <OutlinedField label="Password:" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="Password" isPassword />
      <OutlinedField label="Confirm Password" icon="lock-closed-outline" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm Password" isPassword />

      <Pressable style={styles.agree} onPress={() => setAgreed((v) => !v)}>
        <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={20} color={theme.accent} />
        <Text style={[styles.agreeText, { color: theme.body }]}>
          I agree to the our <Text style={[styles.link, { color: theme.link }]}>Terms of Use</Text> and <Text style={[styles.link, { color: theme.link }]}>Privacy Policy</Text>
        </Text>
      </Pressable>

      {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}
      <GradientButton label="Sign Up" onPress={handleRegister} loading={loading} disabled={!agreed} />

      <Text style={[styles.loginLine, { color: theme.muted }]}>
        Already Registered? <Link href="/auth/login" style={[styles.link, { color: theme.link }]}>Sign In</Link>
      </Text>
      <SocialAuthRow caption="OR" />
      <Text style={[styles.socialHint, { color: theme.muted }]}>Sign up with a social account</Text>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center' },
  accent: {},
  rule: { alignSelf: 'center', width: 54, height: 4, borderRadius: 4, marginVertical: 10 },
  subtitle: { textAlign: 'center', marginBottom: 18, lineHeight: 20 },
  agree: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 },
  agreeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  link: { fontWeight: '700' },
  error: { textAlign: 'center', marginBottom: 8, lineHeight: 20 },
  loginLine: { textAlign: 'center', marginTop: 16 },
  socialHint: { textAlign: 'center', marginTop: -8 },
});
