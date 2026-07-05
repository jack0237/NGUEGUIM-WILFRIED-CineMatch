import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  Sora_300Light,
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/sora';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthContext, useAuthState } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const auth = useAuthState();
  const scheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    'Sora-Light':     Sora_300Light,
    'Sora-Regular':   Sora_400Regular,
    'Sora-SemiBold':  Sora_600SemiBold,
    'Sora-Bold':      Sora_700Bold,
    'Sora-ExtraBold': Sora_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded && !auth.isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, auth.isLoading]);

  useEffect(() => {
    if (auth.isLoading || !fontsLoaded) return;
    const inAuthGroup = segments[0] === '(auth)';
    const isCallback = segments[1] === 'callback';
    if (!auth.session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (auth.session && inAuthGroup && !isCallback) {
      router.replace('/(tabs)/swipe');
    }
  }, [auth.session, auth.isLoading, fontsLoaded, segments]);

  if (!fontsLoaded || auth.isLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthContext.Provider value={auth}>
        <ThemeProvider value={scheme === 'light' ? DefaultTheme : DarkTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="movie/[id]"
              options={{
                headerShown: true,
                headerTransparent: true,
                headerTitle: '',
                headerTintColor: '#FFFFFF',
                headerBackButtonDisplayMode: 'minimal',
              }}
            />
            <Stack.Screen name="group/[id]" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </AuthContext.Provider>
    </GestureHandlerRootView>
  );
}
