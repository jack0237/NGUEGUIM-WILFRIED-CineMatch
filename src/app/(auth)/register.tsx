import { useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Stitch } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme';
import { supabase } from '@/services/supabase';

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_H = Math.min(280, Math.floor(SCREEN_H * 0.34));

export default function RegisterScreen() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSignUp() {
    if (!email || !password || !confirm) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={[s.root, { backgroundColor: C.bg }]}>
        <View style={[s.successContainer, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <View style={s.successIconWrap}>
            <Ionicons name="checkmark" size={40} color={Stitch.secondary} />
          </View>
          <Text style={[s.successTitle, { color: C.textPrimary }]}>Compte créé !</Text>
          <Text style={[s.successSub, { color: C.textSecondary }]}>
            Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.
          </Text>
          <Button
            variant="gradient"
            label="Se connecter"
            icon="arrow-forward"
            onPress={() => router.replace('/(auth)/login')}
            style={s.successBtn}
          />
        </View>
      </View>
    );
  }

  // ── Form state ─────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      {/* ── Hero (top ~34%) — dégradé cinématique local ── */}
      <View style={[s.hero, { backgroundColor: Stitch.surfaceContainerLowest }]}>
        <LinearGradient
          colors={[Stitch.primaryContainer, Stitch.background]}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[s.brand, { paddingTop: insets.top }]}>
          <Text style={[s.brandTitle, { color: C.textPrimary }]}>CineMatch</Text>
          <Text style={[s.brandTagline, { color: C.textSecondary }]}>Create your account.</Text>
        </View>
      </View>

      {/* ── Glass panel ── */}
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[s.panel, { backgroundColor: C.surface }]}>
          <View style={[s.handle, { backgroundColor: C.surfaceHighest }]} />

          <ScrollView
            style={s.flex}
            contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            <View style={s.form}>
              <Input
                label="Email Address"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <Input
                label="Password"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                isPassword
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <Input
                label="Confirm Password"
                value={confirm}
                onChangeText={(t) => { setConfirm(t); setError(''); }}
                isPassword
                autoComplete="new-password"
                textContentType="newPassword"
              />
            </View>

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <View style={s.spacer} />

            <Button
              variant="gradient"
              label="Sign Up"
              icon="arrow-forward"
              loading={loading}
              onPress={handleSignUp}
            />

            <View style={s.signinRow}>
              <Text style={[s.signinText, { color: C.textSecondary }]}>Already have an account?</Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={[s.signinLink, { color: C.primary }]}>Sign In</Text>
                </Pressable>
              </Link>
            </View>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  hero: {
    height: HERO_H,
    width: '100%',
    justifyContent: 'flex-end',
  },
  brand: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    zIndex: 10,
  },
  brandTitle: {
    fontSize: 48,
    lineHeight: 52,
    fontFamily: 'Sora-ExtraBold',
    letterSpacing: -0.96,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
    marginBottom: 8,
  },
  brandTagline: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: 'Sora-SemiBold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  panel: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
    paddingTop: 16,
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  form: {
    gap: 32,
    marginTop: 8,
  },
  errorText: {
    color: Stitch.error,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  spacer: { flex: 1, minHeight: 28 },

  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 24,
  },
  signinText: {
    fontSize: 16,
    lineHeight: 24,
  },
  signinLink: {
    fontSize: 14,
    fontFamily: 'Sora-SemiBold',
    letterSpacing: 0.7,
  },

  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(78,222,163,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: 'Sora-Bold',
    letterSpacing: -0.3,
  },
  successSub: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  successBtn: {
    alignSelf: 'stretch',
    marginTop: 8,
  },
});
