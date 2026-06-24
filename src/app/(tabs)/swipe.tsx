import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SwipeCard } from '@/components/SwipeCard';
import { MovieInfoSheet } from '@/components/MovieInfoSheet';
import { SwipeCardSkeleton } from '@/components/skeletons';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { discoverMovies, getPopularMovies } from '@/services/tmdb';
import { getSwipedMovieIds, saveSwipe } from '@/services/swipe';
import type { Movie } from '@/types/tmdb';
import {
  FilterSheet,
  ERA_DATE_RANGES,
  INITIAL_FILTER,
  type FilterState,
} from '@/components/FilterSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const CARD_HEIGHT = Dimensions.get('window').height * 0.55;
const STACK_SIZE = 3;

export default function SwipeScreen() {
  const C = useColors();
  const { user } = useAuth();
  const [deck, setDeck] = useState<Movie[]>([]);
  const [sheetMovie, setSheetMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const page = useRef(1);
  const swipedIds = useRef<Set<number>>(new Set());
  const isFetching = useRef(false);
  // Use a ref so loadMovies (useCallback with empty deps) always reads the current filters
  const filtersRef = useRef<FilterState>(INITIAL_FILTER);
  const [appliedFilters, setAppliedFiltersState] = useState<FilterState>(INITIAL_FILTER);

  const hasActiveFilters =
    appliedFilters.genres.length > 0 ||
    appliedFilters.minScore > 0 ||
    appliedFilters.era !== null;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  // topCardOpacity: set to 0 on the UI thread (withTiming callback) before translateX resets,
  // so the departing card cannot flash back to center. Restored to 1 after deck commit.
  const topCardOpacity = useSharedValue(1);
  // bgSwipeProgress: drives background-card scale independently from translateX.
  // Animated with a spring on swipe exit so background cards ease back to rest
  // instead of snapping when translateX jumps from SCREEN_WIDTH*1.5 back to 0.
  const bgSwipeProgress = useSharedValue(0);

  const isLikePressed = useSharedValue(0);
  const isNopePressed = useSharedValue(0);

  // ── Like button animation ──────────────────────────────────────────────────
  const likeButtonStyle = useAnimatedStyle(() => {
    const swipeProgress = interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp');
    const progress = Math.max(swipeProgress, isLikePressed.value);
    return {
      transform: [{ scale: interpolate(progress, [0, 1], [1, 1.15]) }],
      backgroundColor: interpolateColor(progress, [0, 1], [C.surfaceElevated, C.likeDim]),
      borderColor: interpolateColor(progress, [0, 1], [C.border, C.like]),
    };
  });

  const likeIconStyle = useAnimatedStyle(() => {
    const swipeProgress = interpolate(translateX.value, [0, SWIPE_THRESHOLD * 0.6], [0, 1], 'clamp');
    return { opacity: Math.max(swipeProgress, isLikePressed.value) };
  });

  // ── Nope button animation ──────────────────────────────────────────────────
  const nopeButtonStyle = useAnimatedStyle(() => {
    const swipeProgress = interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp');
    const progress = Math.max(swipeProgress, isNopePressed.value);
    return {
      transform: [{ scale: interpolate(progress, [0, 1], [1, 1.15]) }],
      backgroundColor: interpolateColor(progress, [0, 1], [C.surfaceElevated, C.nopeDim]),
      borderColor: interpolateColor(progress, [0, 1], [C.border, C.nope]),
    };
  });

  const nopeIconStyle = useAnimatedStyle(() => {
    const swipeProgress = interpolate(translateX.value, [-SWIPE_THRESHOLD * 0.6, 0], [1, 0], 'clamp');
    return { opacity: Math.max(swipeProgress, isNopePressed.value) };
  });

  // ── Load movies ────────────────────────────────────────────────────────────
  const loadMovies = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const f = filtersRef.current;
      const eraRange = f.era ? ERA_DATE_RANGES[f.era] : {};
      const hasFilters = f.genres.length > 0 || f.minScore > 0 || f.era !== null;

      // Skip pages where all films were already swiped (up to 5 consecutive pages)
      let fresh: Movie[] = [];
      let attempts = 0;
      while (fresh.length === 0 && attempts < 5) {
        const { results } = hasFilters
          ? await discoverMovies({
              page: page.current,
              ...(f.genres.length > 0 ? { with_genres: f.genres.join(',') } : {}),
              ...(f.minScore > 0 ? { 'vote_average.gte': String(f.minScore) } : {}),
              ...eraRange,
            })
          : await getPopularMovies(page.current);
        page.current += 1;
        fresh = results.filter((m) => !swipedIds.current.has(m.id));
        attempts += 1;
        if (results.length === 0) break; // no more pages
      }

      if (fresh.length > 0) {
        setDeck((prev) => [...prev, ...fresh]);
      }
    } catch {
      setError('Impossible de charger les films. Vérifie ta connexion.');
    } finally {
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    async function init() {
      if (!user) return;
      try {
        const ids = await getSwipedMovieIds(user.id);
        swipedIds.current = new Set(ids);
      } catch {
        // non-blocking
      }
      await loadMovies();
      setLoading(false);
    }
    init();
  }, [user, loadMovies]);

  useEffect(() => {
    if (!loading && deck.length <= STACK_SIZE + 6) loadMovies();
  }, [deck.length, loading, loadMovies]);

  // ── Restore top card visibility after React commits the deck change ──────────
  // translateX/Y are already reset on the UI thread (inside the withTiming callback),
  // so we only need to make the new top card visible here.
  useLayoutEffect(() => {
    topCardOpacity.value = 1;
  }, [deck]);

  // ── Swipe action ───────────────────────────────────────────────────────────
  const handleSwipe = useCallback(
    (action: 'like' | 'dislike') => {
      const movie = deck[0];
      if (!movie || !user) return;
      swipedIds.current.add(movie.id);
      setDeck((prev) => prev.slice(1));
      saveSwipe(user.id, movie, action).catch(() => {});
    },
    [deck, user],
  );

  // ── Pan gesture ────────────────────────────────────────────────────────────
  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
      bgSwipeProgress.value = Math.min(Math.abs(e.translationX) / 150, 1);
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        // Keep bgSwipeProgress in sync with the exit animation
        bgSwipeProgress.value = withTiming(1, { duration: 280 });
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 280 }, (finished) => {
          if (finished) {
            // UI thread — synchronous. Hide card then reset position.
            topCardOpacity.value = 0;
            translateX.value = 0;
            translateY.value = 0;
            // Spring bgSwipeProgress back to 0 so background cards ease to rest.
            bgSwipeProgress.value = withSpring(0, { damping: 26, stiffness: 200, overshootClamping: true });
            runOnJS(handleSwipe)('like');
          }
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        bgSwipeProgress.value = withTiming(1, { duration: 280 });
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 280 }, (finished) => {
          if (finished) {
            topCardOpacity.value = 0;
            translateX.value = 0;
            translateY.value = 0;
            bgSwipeProgress.value = withSpring(0, { damping: 26, stiffness: 200, overshootClamping: true });
            runOnJS(handleSwipe)('dislike');
          }
        });
      } else {
        translateX.value = withSpring(0, { damping: 26, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 26, stiffness: 200 });
        bgSwipeProgress.value = withSpring(0, { damping: 26, stiffness: 200, overshootClamping: true });
      }
    });

  // ── Button press swipe ─────────────────────────────────────────────────────
  function pressSwipe(action: 'like' | 'dislike') {
    const direction = action === 'like' ? 1 : -1;
    bgSwipeProgress.value = withTiming(1, { duration: 280 });
    translateX.value = withTiming(direction * SCREEN_WIDTH * 1.5, { duration: 280 }, (finished) => {
      if (finished) {
        topCardOpacity.value = 0;
        translateX.value = 0;
        translateY.value = 0;
        bgSwipeProgress.value = withSpring(0, { damping: 26, stiffness: 200, overshootClamping: true });
        runOnJS(handleSwipe)(action);
      }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <SwipeCardSkeleton />;

  if (error) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: C.bg }]}>
        <Ionicons name="wifi-outline" size={48} color={C.textMuted} />
        <Text style={[styles.errorText, { color: C.textSecondary }]}>{error}</Text>
        <Pressable
          onPress={() => { setError(''); loadMovies(); }}
          style={[styles.retryBtn, { backgroundColor: C.primary }]}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (deck.length === 0) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: C.bg }]}>
        <Text style={styles.emptyEmoji}>🎬</Text>
        <Text style={[styles.emptyTitle, { color: C.textPrimary }]} numberOfLines={2}>Vous avez tout vu !</Text>
        <Text style={[styles.emptySubtitle, { color: C.textSecondary }]} numberOfLines={3}>Revenez demain pour de nouveaux films.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: C.primary }]}>CineMatch</Text>
        <Pressable onPress={() => setFilterVisible(true)} hitSlop={8} style={{ position: 'relative' }}>
          <Ionicons name="options-outline" size={24} color={C.primary} />
          {hasActiveFilters && (
            <View style={[styles.filterDot, { backgroundColor: C.like }]} />
          )}
        </Pressable>
      </View>

      {/* Card stack */}
      <View style={styles.deckContainer}>
        {deck
          .slice(0, STACK_SIZE)
          .reverse()
          .map((movie, revIdx) => {
            const idx = STACK_SIZE - 1 - revIdx;
            const isTop = idx === 0;
            return isTop ? (
              <GestureDetector key={movie.id} gesture={gesture}>
                <SwipeCard movie={movie} translateX={translateX} translateY={translateY} topCardOpacity={topCardOpacity} bgSwipeProgress={bgSwipeProgress} isTop index={0} />
              </GestureDetector>
            ) : (
              <SwipeCard key={movie.id} movie={movie} translateX={translateX} translateY={translateY} topCardOpacity={topCardOpacity} bgSwipeProgress={bgSwipeProgress} isTop={false} index={idx} />
            );
          })}
      </View>

      {/* Filter sheet */}
      <FilterSheet
        visible={filterVisible}
        initialState={appliedFilters}
        onClose={() => setFilterVisible(false)}
        onApply={(state) => {
          filtersRef.current = state;
          setAppliedFiltersState(state);
          page.current = 1;
          setDeck([]);
          loadMovies();
        }}
      />

      {/* Action buttons */}
      <View style={styles.actions}>
        {/* Nope */}
        <Pressable
          onPress={() => pressSwipe('dislike')}
          onPressIn={() => { isNopePressed.value = withTiming(1, { duration: 120 }); }}
          onPressOut={() => { isNopePressed.value = withTiming(0, { duration: 200 }); }}>
          <Animated.View style={[styles.actionBtn, styles.actionBtnLg, nopeButtonStyle]}>
            <Ionicons name="close" size={28} color={C.textSecondary} />
            <Animated.View style={[StyleSheet.absoluteFill, styles.iconOverlay, nopeIconStyle]}>
              <Ionicons name="close" size={28} color={C.nope} />
            </Animated.View>
          </Animated.View>
        </Pressable>

        {/* Info */}
        <Pressable
          style={[styles.actionBtnInfo, { backgroundColor: C.surfaceElevated, borderColor: C.border }]}
          onPress={() => {
            const movie = deck[0];
            if (deck[0]) setSheetMovie(deck[0]);
          }}>
          <Ionicons name="information-circle-outline" size={22} color={C.textSecondary} />
        </Pressable>

        {/* Like */}
        <Pressable
          onPress={() => pressSwipe('like')}
          onPressIn={() => { isLikePressed.value = withTiming(1, { duration: 120 }); }}
          onPressOut={() => { isLikePressed.value = withTiming(0, { duration: 200 }); }}>
          <Animated.View style={[styles.actionBtn, styles.actionBtnLg, likeButtonStyle]}>
            <Ionicons name="heart" size={28} color={C.textSecondary} />
            <Animated.View style={[StyleSheet.absoluteFill, styles.iconOverlay, likeIconStyle]}>
              <Ionicons name="heart" size={28} color={C.like} />
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>

      {/* Movie info bottom sheet */}
      <MovieInfoSheet movie={sheetMovie} onClose={() => setSheetMovie(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  filterDot: {
    position: 'absolute',
    top: 0,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  deckContainer: {
    flex: 1,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    height: CARD_HEIGHT,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  // Base for animated large buttons (nope/like) — bg/border set by useAnimatedStyle
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionBtnLg: {
    width: 64,
    height: 64,
  },
  // Info button — static glassmorphic style (Stitch: w-12 h-12 bg-surface-container/50)
  actionBtnInfo: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
  },
  loadingText: { fontSize: FontSize.sm },
  errorText: { fontSize: FontSize.base, textAlign: 'center' },
  retryBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: FontSize['2xl'], fontWeight: '700' },
  emptySubtitle: { fontSize: FontSize.base, textAlign: 'center' },
});
