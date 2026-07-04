import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-theme';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface TabIconConfig {
  /** Outline variant shown when inactive */
  name: MCIName;
  /** Filled variant shown when active */
  activeName: MCIName;
}

interface TabIconProps extends TabIconConfig {
  color: string;
  focused: boolean;
  size?: number;
}

export function TabIcon({ name, activeName, color, focused, size = 22 }: TabIconProps) {
  const C = useColors();
  return (
    <View style={styles.wrapper}>
      {focused && <View style={[styles.pill, { backgroundColor: C.primaryDim }]} />}
      <MaterialCommunityIcons
        name={focused ? activeName : name}
        size={size}
        color={color}
      />
    </View>
  );
}

/** Factory to pass directly to Expo Router's `tabBarIcon` option */
export function tabIcon(config: TabIconConfig) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <TabIcon {...config} color={color} focused={focused} />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 30,
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
  },
});
