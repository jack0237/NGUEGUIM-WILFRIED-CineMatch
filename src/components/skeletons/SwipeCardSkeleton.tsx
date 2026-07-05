import { Dimensions, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShimmerBlock } from './ShimmerBlock';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme';

const CARD_HEIGHT = Dimensions.get('window').height * 0.55;

export function SwipeCardSkeleton() {
  const C = useColors();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <ShimmerBlock height={26} borderRadius={8} style={{ width: 130 }} />
        <ShimmerBlock height={26} borderRadius={13} style={{ width: 26 }} />
      </View>

      {/* Card stack */}
      <View style={styles.deckContainer}>
        {/* Background card 2 */}
        <View style={styles.bgCard2}>
          <ShimmerBlock height={CARD_HEIGHT} borderRadius={24} style={StyleSheet.absoluteFill as any} />
        </View>
        {/* Background card 1 */}
        <View style={styles.bgCard1}>
          <ShimmerBlock height={CARD_HEIGHT} borderRadius={24} style={StyleSheet.absoluteFill as any} />
        </View>
        {/* Main card */}
        <View style={StyleSheet.absoluteFill}>
          <ShimmerBlock height={CARD_HEIGHT} borderRadius={24} style={{ flex: 1 }} />
          {/* Rating badge */}
          <View style={styles.ratingBadge}>
            <ShimmerBlock height={28} borderRadius={Radius.pill} style={{ width: 64 }} />
          </View>
          {/* Info overlay */}
          <View style={styles.infoOverlay}>
            <View style={styles.chipsRow}>
              <ShimmerBlock height={22} borderRadius={Radius.pill} style={{ width: 72 }} />
              <ShimmerBlock height={22} borderRadius={Radius.pill} style={{ width: 60 }} />
            </View>
            <ShimmerBlock height={26} borderRadius={8} style={{ marginBottom: 6 }} />
            <ShimmerBlock height={14} borderRadius={7} style={{ width: '45%', marginBottom: 12 }} />
            <ShimmerBlock height={13} borderRadius={6} style={{ marginBottom: 5 }} />
            <ShimmerBlock height={13} borderRadius={6} style={{ width: '75%' }} />
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <ShimmerBlock height={64} borderRadius={Radius.pill} style={{ width: 64 }} />
        <ShimmerBlock height={48} borderRadius={Radius.pill} style={{ width: 48 }} />
        <ShimmerBlock height={64} borderRadius={Radius.pill} style={{ width: 64 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  deckContainer: {
    flex: 1,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    height: CARD_HEIGHT,
  },
  bgCard2: {
    ...StyleSheet.absoluteFill,
    transform: [{ scale: 0.9 }, { translateY: -20 }],
    opacity: 0.4,
  },
  bgCard1: {
    ...StyleSheet.absoluteFill,
    transform: [{ scale: 0.95 }, { translateY: -10 }],
    opacity: 0.7,
  },
  ratingBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
});
