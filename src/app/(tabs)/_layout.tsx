import { Tabs } from 'expo-router';
import { Fonts } from '@/constants/theme';
import { tabIcon } from '@/components/ui/TabIcon';
import { useColors } from '@/hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 25);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.tabBar,
          borderTopColor: C.tabBarBorder,
          borderTopWidth: 1,
          height: 68 + bottomPad,
          paddingBottom: 10 + bottomPad,
          paddingTop: 6,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.tabBarInactive,
        tabBarLabelStyle: {
          fontFamily: Fonts.semibold,
          fontSize: 10,
          letterSpacing: 0.4,
          marginTop: 2,
        },
      }}>

      <Tabs.Screen
        name="swipe"
        options={{
          title: 'Swipe',
          tabBarIcon: tabIcon({ name: 'cards-outline', activeName: 'cards' }),
        }}
      />

      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: tabIcon({ name: 'heart-outline', activeName: 'heart' }),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: 'Recherche',
          tabBarIcon: tabIcon({ name: 'magnify', activeName: 'magnify' }),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: tabIcon({ name: 'account-outline', activeName: 'account' }),
        }}
      />

      {/* History: hidden from tab bar, tab bar also hidden when active */}
      <Tabs.Screen
        name="history"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
