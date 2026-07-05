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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Stitch } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme';
import { supabase } from '@/services/supabase';

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_H = Math.min(353, Math.floor(SCREEN_H * 0.42));

export default function LoginScreen() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      router.replace('/(tabs)/swipe');
    }
  }

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      {/* ── Hero (top ~40%) — dégradé cinématique local ── */}
      <View style={[s.hero, { backgroundColor: Stitch.surfaceContainerLowest }]}>
        <LinearGradient
          colors={[Stitch.primaryContainer, Stitch.background]}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[s.brand, { paddingTop: insets.top }]}>
          <Text style={[s.brandTitle, { color: C.textPrimary }]}>CineMatch</Text>
          <Text style={[s.brandTagline, { color: C.textSecondary }]} numberOfLines={2}>Discover your next favorite film.</Text>
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
                autoComplete="password"
                textContentType="password"
              />
            </View>

            <Link href="/(auth)/forgot-password" asChild>
              <Pressable style={s.forgotRow}>
                <Text style={[s.forgotText, { color: C.primary }]}>Forgot password?</Text>
              </Pressable>
            </Link>

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <View style={s.spacer} />

            <Button
              variant="gradient"
              label="Sign In"
              icon="arrow-forward"
              loading={loading}
              onPress={handleSignIn}
            />

            <View style={s.signupRow}>
              <Text style={[s.signupText, { color: C.textSecondary }]}>{"Don't have an account?"}</Text>
              <Link href="/(auth)/register" asChild>
                <Pressable>
                  <Text style={[s.signupLink, { color: C.primary }]}>Sign Up</Text>
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
    marginBottom: 24,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  form: {
    gap: 32,
    marginTop: 16,
  },

  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 16,
  },
  forgotText: {
    fontSize: 14,
    fontFamily: 'Sora-SemiBold',
    letterSpacing: 0.7,
  },
  errorText: {
    color: Stitch.error,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },

  spacer: { flex: 1, minHeight: 32 },

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 24,
  },
  signupText: {
    fontSize: 16,
    lineHeight: 24,
  },
  signupLink: {
    fontSize: 14,
    fontFamily: 'Sora-SemiBold',
    letterSpacing: 0.7,
  },
});
