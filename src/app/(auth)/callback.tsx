import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Stitch } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme';
import { supabase } from '@/services/supabase';

export default function AuthCallbackScreen() {
  const C = useColors();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function handleDeepLink(url: string | null) {
      if (!url || cancelled) return;

      const hashIndex = url.indexOf('#');
      if (hashIndex === -1) {
        if (!cancelled) setStatus('error');
        return;
      }

      const params = new URLSearchParams(url.slice(hashIndex + 1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken || !refreshToken) {
        if (!cancelled) setStatus('error');
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!cancelled) {
        if (error) {
          setStatus('error');
        } else {
          router.replace('/(tabs)/swipe');
        }
      }
    }

    // App ouverte depuis le cold start par le deep link
    Linking.getInitialURL().then(handleDeepLink);

    // App déjà en foreground (email ouvert depuis l'app)
    const sub = Linking.addEventListener('url', (e) => handleDeepLink(e.url));

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [router]);

  return (
    <View style={[styles.root, { backgroundColor: Stitch.background }]}>
      {status === 'loading' ? (
        <>
          <ActivityIndicator size="large" color={Stitch.primary} />
          <Text style={[styles.label, { color: C.textSecondary }]}>
            Vérification en cours…
          </Text>
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: Stitch.error }]}>
            Lien invalide ou expiré.
          </Text>
          <Text
            style={[styles.link, { color: Stitch.primary }]}
            onPress={() => router.replace('/(auth)/login')}
          >
            Retour à la connexion
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  label: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  link: {
    fontSize: 14,
    fontFamily: 'Sora-SemiBold',
    letterSpacing: 0.5,
    marginTop: 8,
  },
});
