import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ButtonProps extends PressableProps {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'gradient' | 'ghost';
  icon?: IoniconName;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  loading = false,
  variant = 'primary',
  icon,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const C = useColors();
  const isGradient = variant === 'gradient';
  const isGhost    = variant === 'ghost';
  const isDisabled = disabled || loading;
  const textColor  = isGhost ? C.textSecondary : '#FFFFFF';

  const inner = loading ? (
    <ActivityIndicator color={textColor} size="small" />
  ) : (
    <View style={styles.row}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {icon && <Ionicons name={icon} size={18} color={textColor} />}
    </View>
  );

  if (isGradient) {
    return (
      <Pressable
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.gradientWrap,
          { shadowColor: C.gradientTo },
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
          style,
        ]}
        {...rest}>
        <LinearGradient
          colors={[C.gradientFrom, C.gradientTo]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}>
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isGhost
          ? [styles.ghost, { borderColor: C.border }]
          : { backgroundColor: C.gradientFrom },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...rest}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  disabled: { opacity: 0.5 },
  pressed:  { opacity: 0.85 },

  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },

  gradientWrap: {
    borderRadius: Radius.pill,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  gradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
