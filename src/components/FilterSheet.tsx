import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, FontSize, Radius, Spacing, Stitch } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme';

// ── Types & constants ─────────────────────────────────────────────────────────

export type Era = 'newest' | '90s' | 'golden' | null;

export interface FilterState {
  genres: number[];
  minScore: number; // 0 = no filter
  era: Era;
}

export const INITIAL_FILTER: FilterState = { genres: [], minScore: 0, era: null };

export const ERA_DATE_RANGES: Record<
  Exclude<Era, null>,
  { 'primary_release_date.gte'?: string; 'primary_release_date.lte'?: string }
> = {
  newest: { 'primary_release_date.gte': '2020-01-01' },
  '90s':  { 'primary_release_date.gte': '1990-01-01', 'primary_release_date.lte': '1999-12-31' },
  golden: { 'primary_release_date.gte': '1960-01-01', 'primary_release_date.lte': '1979-12-31' },
};

const FILTER_GENRES = [
  { id: 28,    label: 'Action' },
  { id: 878,   label: 'Sci-Fi' },
  { id: 53,    label: 'Thriller' },
  { id: 18,    label: 'Drame' },
  { id: 35,    label: 'Comédie' },
  { id: 27,    label: 'Horreur' },
  { id: 10749, label: 'Romance' },
  { id: 12,    label: 'Aventure' },
  { id: 16,    label: 'Animation' },
  { id: 9648,  label: 'Mystère' },
];

const ERA_CHIPS: { id: Era; label: string }[] = [
  { id: 'newest', label: 'Récents' },
  { id: '90s',    label: 'Années 90' },
  { id: 'golden', label: 'Âge d\'or' },
];

const SHEET_H = 680;
const THUMB   = 24;
const MAX_SCORE = 10;

// ── Score slider ──────────────────────────────────────────────────────────────

function ScoreSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const C = useColors();
  const trackW = useRef(0);
  const [displayW, setDisplayW] = useState(0);
  const pct = value / MAX_SCORE;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => snap(e.nativeEvent.locationX),
      onPanResponderMove: (e) => snap(e.nativeEvent.locationX),
    }),
  ).current;

  function snap(x: number) {
    const p = Math.max(0, Math.min(1, x / trackW.current));
    onChange(Math.round(p * MAX_SCORE * 2) / 2); // 0.5 steps
  }

  return (
    <View
      onLayout={e => {
        trackW.current = e.nativeEvent.layout.width;
        setDisplayW(e.nativeEvent.layout.width);
      }}
      style={[styles.track, { backgroundColor: C.surfaceHighest }]}
      {...pan.panHandlers}
    >
      <View
        style={[
          styles.trackFill,
          { width: `${pct * 100}%`, backgroundColor: C.primary, shadowColor: C.primary },
        ]}
      />
      {displayW > 0 && (
        <View
          style={[
            styles.thumb,
            {
              left: pct * displayW - THUMB / 2,
              backgroundColor: C.primary,
              borderColor: Stitch.background,
              shadowColor: C.primary,
            },
          ]}
        />
      )}
      {/* Axis labels */}
      <View style={styles.axisRow}>
        <Text style={[styles.axisLabel, { color: `${Stitch.onSurfaceVariant}66` }]}>0.0</Text>
        <Text style={[styles.axisLabel, { color: `${Stitch.onSurfaceVariant}66` }]}>10.0</Text>
      </View>
    </View>
  );
}

// ── FilterSheet ───────────────────────────────────────────────────────────────

export interface FilterSheetProps {
  visible: boolean;
  initialState?: FilterState;
  onClose: () => void;
  onApply: (state: FilterState) => void;
}

export function FilterSheet({
  visible,
  initialState = INITIAL_FILTER,
  onClose,
  onApply,
}: FilterSheetProps) {
  const C = useColors();
  const insets = useSafeAreaInsets();

  // Internal pending state
  const [genres,   setGenres]   = useState<number[]>(initialState.genres);
  const [minScore, setMinScore] = useState(initialState.minScore);
  const [era,      setEra]      = useState<Era>(initialState.era);

  // Sync with initialState each time the sheet opens
  useEffect(() => {
    if (visible) {
      setGenres(initialState.genres);
      setMinScore(initialState.minScore);
      setEra(initialState.era);
    }
  }, [visible]);

  // Animation
  const sheetAnim   = useSharedValue(SHEET_H);
  const backdropAnim = useSharedValue(0);

  const sheetStyle   = useAnimatedStyle(() => ({ transform: [{ translateY: sheetAnim.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropAnim.value }));

  useEffect(() => {
    if (visible) {
      sheetAnim.value   = withSpring(0, { damping: 30, stiffness: 200, overshootClamping: true });
      backdropAnim.value = withTiming(1, { duration: 250 });
    }
  }, [visible]);

  function close() {
    backdropAnim.value = withTiming(0, { duration: 200 });
    sheetAnim.value    = withSpring(SHEET_H, { damping: 30, stiffness: 200, overshootClamping: true }, finished => {
      if (finished) runOnJS(onClose)();
    });
  }

  function handleApply() {
    onApply({ genres, minScore, era });
    close();
  }

  function handleReset() {
    setGenres([]);
    setMinScore(0);
    setEra(null);
  }

  function toggleGenre(id: number) {
    setGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id],
    );
  }

  const scoreLabel = minScore === 0 ? 'Tout' : `${minScore.toFixed(1)}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: C.surfaceElevated,
            paddingBottom: insets.bottom + Spacing.lg,
            borderColor: C.border,
          },
          sheetStyle,
        ]}
      >
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: C.borderLight }]} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: C.textPrimary }]}>Refine Search</Text>
          <Pressable onPress={close} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={C.primary} />
          </Pressable>
        </View>

        {/* Scrollable content */}
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

          {/* Genres */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: `${Stitch.onSurfaceVariant}99` }]}>
              GENRES
            </Text>
            <View style={styles.genreGrid}>
              {FILTER_GENRES.map(g => {
                const active = genres.includes(g.id);
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => toggleGenre(g.id)}
                    style={({ pressed }) => [
                      styles.genreChip,
                      {
                        backgroundColor: active ? C.primary : C.chip,
                        borderColor: active ? C.primary : C.border,
                        shadowColor: active ? C.primary : 'transparent',
                        transform: [{ scale: pressed ? 0.93 : 1 }],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.genreChipLabel,
                        { color: active ? Stitch.onPrimary : C.textPrimary },
                      ]}
                    >
                      {g.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* TMDB Score */}
          <View style={styles.section}>
            <View style={styles.scoreHeader}>
              <Text style={[styles.sectionLabel, { color: `${Stitch.onSurfaceVariant}99` }]}>
                SCORE TMDB MINIMUM
              </Text>
              <View style={[styles.scoreBadge, { backgroundColor: `${C.primary}1A` }]}>
                <Text style={[styles.scoreBadgeLabel, { color: C.primary }]}>{scoreLabel}</Text>
              </View>
            </View>
            <ScoreSlider value={minScore} onChange={setMinScore} />
          </View>

          {/* Era */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: `${Stitch.onSurfaceVariant}99` }]}>
              ÈRE
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eraRow}
            >
              {ERA_CHIPS.map(chip => {
                const active = era === chip.id;
                return (
                  <Pressable
                    key={chip.id}
                    onPress={() => setEra(prev => (prev === chip.id ? null : chip.id))}
                    style={({ pressed }) => [
                      styles.eraChip,
                      {
                        backgroundColor: active ? C.primary : C.chip,
                        borderColor: active ? C.primary : C.border,
                        shadowColor: active ? C.primary : 'transparent',
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.eraChipLabel,
                        { color: active ? Stitch.onPrimary : C.textPrimary },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: C.border }]}>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.footerBtn,
              {
                backgroundColor: pressed ? C.chip : C.surfaceElevated,
                borderColor: C.border,
                flex: 1,
              },
            ]}
          >
            <Text style={[styles.footerBtnLabel, { color: C.textSecondary }]}>
              Réinitialiser
            </Text>
          </Pressable>

          <Pressable
            onPress={handleApply}
            style={({ pressed }) => [
              styles.footerBtn,
              {
                backgroundColor: C.primary,
                opacity: pressed ? 0.88 : 1,
                flex: 2,
                shadowColor: C.primary,
              },
            ]}
          >
            <Text style={[styles.footerBtnLabel, { color: Stitch.onPrimary }]}>
              Appliquer
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.6)' },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SHEET_H,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },

  handle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },

  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  sheetTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize['2xl'],
  },
  closeBtn: { padding: 4 },

  section: { marginBottom: Spacing.xl + Spacing.sm },
  sectionLabel: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.xs,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },

  // Genres
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  genreChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 2,
  },
  genreChipLabel: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.sm,
    letterSpacing: 0.5,
  },

  // Score
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.lg,
  },
  scoreBadgeLabel: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.xl,
  },

  // Slider
  track: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  thumb: {
    position: 'absolute',
    top: -(THUMB / 2) + 4,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg + 4,
  },
  axisLabel: {
    fontFamily: Fonts.light,
    fontSize: 10,
    letterSpacing: 0.5,
  },

  // Era
  eraRow: { gap: Spacing.md },
  eraChip: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 2,
  },
  eraChipLabel: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.sm,
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    marginTop: Spacing.sm,
  },
  footerBtn: {
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  footerBtnLabel: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.sm,
    letterSpacing: 0.8,
  },
});
