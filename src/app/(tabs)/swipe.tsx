import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Swiper from 'react-native-deck-swiper';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const CARD_H_MARGIN = Spacing.lg;
const STACK_SIZE = 3;

export default function SwipeScreen() {
  const C = useColors();
  const { user } = useAuth();
  // deck only grows (pagination appends); cardIndex tracks the swiper's position.
  const [deck, setDeck] = useState<Movie[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
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
  const swiperRef = useRef<Swiper<Movie>>(null);
  // Measured height of the deck area. react-native-deck-swiper sizes cards from
  // Dimensions.get('window'), ignoring its container — so we feed it margins
  // derived from this measurement to make the card fill the deck area exactly.
  const [deckHeight, setDeckHeight] = useState(0);

  const hasActiveFilters =
    appliedFilters.genres.length > 0 ||
    appliedFilters.minScore > 0 ||
    appliedFilters.era !== null;

  // gestureX mirrors the swiper's horizontal drag (via onSwiping) to drive
  // the like/nope button highlights while dragging.
  const gestureX = useSharedValue(0);
  const isLikePressed = useSharedValue(0);
  const isNopePressed = useSharedValue(0);

  // ── Like button animation ──────────────────────────────────────────────────
  const likeButtonStyle = useAnimatedStyle(() => {
    const swipeProgress = interpolate(gestureX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp');
    const progress = Math.max(swipeProgress, isLikePressed.value);
    return {
      transform: [{ scale: interpolate(progress, [0, 1], [1, 1.15]) }],
      backgroundColor: interpolateColor(progress, [0, 1], [C.surfaceElevated, C.likeDim]),
      borderColor: interpolateColor(progress, [0, 1], [C.border, C.like]),
    };
  });

  const likeIconStyle = useAnimatedStyle(() => {
    const swipeProgress = interpolate(gestureX.value, [0, SWIPE_THRESHOLD * 0.6], [0, 1], 'clamp');
    return { opacity: Math.max(swipeProgress, isLikePressed.value) };
  });

  // ── Nope button animation ──────────────────────────────────────────────────
  const nopeButtonStyle = useAnimatedStyle(() => {
    const swipeProgress = interpolate(gestureX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp');
    const progress = Math.max(swipeProgress, isNopePressed.value);
    return {
      transform: [{ scale: interpolate(progress, [0, 1], [1, 1.15]) }],
      backgroundColor: interpolateColor(progress, [0, 1], [C.surfaceElevated, C.nopeDim]),
      borderColor: interpolateColor(progress, [0, 1], [C.border, C.nope]),
    };
  });

  const nopeIconStyle = useAnimatedStyle(() => {
    const swipeProgress = interpolate(gestureX.value, [-SWIPE_THRESHOLD * 0.6, 0], [1, 0], 'clamp');
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

  const remaining = deck.length - cardIndex;
  useEffect(() => {
    if (!loading && remaining <= STACK_SIZE + 6) loadMovies();
  }, [remaining, loading, loadMovies]);

  // ── Swipe persistence ──────────────────────────────────────────────────────
  const persistSwipe = useCallback(
    (index: number, action: 'like' | 'dislike') => {
      const movie = deck[index];
      if (!movie || !user) return;
      swipedIds.current.add(movie.id);
      saveSwipe(user.id, movie, action).catch(() => {});
    },
    [deck, user],
  );

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

  if (remaining <= 0) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: C.bg }]}>
        <Text style={styles.emptyEmoji}>🎬</Text>
        <Text style={[styles.emptyTitle, { color: C.textPrimary }]} numberOfLines={2}>Vous avez tout vu !</Text>
        <Text style={[styles.emptySubtitle, { color: C.textSecondary }]} numberOfLines={3}>Revenez demain pour de nouveaux films.</Text>
      </SafeAreaView>
    );
  }

  const topMovie = deck[cardIndex];

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

      {/* Card stack — react-native-deck-swiper owns gestures, exit animations
          and the stack. It advances an internal index over a stable cards array,
          so a swiped card is never recycled with new content (no glitch). */}
      <View style={styles.deckContainer} onLayout={(e) => setDeckHeight(e.nativeEvent.layout.height)}>
        {deckHeight > 0 && (
        <Swiper
          ref={swiperRef}
          cards={deck}
          cardIndex={cardIndex}
          keyExtractor={(movie) => String(movie.id)}
          renderCard={(movie) => (movie ? <SwipeCard movie={movie} /> : null)}
          onSwiping={(x) => { gestureX.value = x; }}
          onSwipedAborted={() => { gestureX.value = withTiming(0, { duration: 200 }); }}
          onSwiped={(index) => {
            gestureX.value = withTiming(0, { duration: 200 });
            setCardIndex(index + 1);
          }}
          onSwipedRight={(index) => persistSwipe(index, 'like')}
          onSwipedLeft={(index) => persistSwipe(index, 'dislike')}
          stackSize={STACK_SIZE}
          stackSeparation={10}
          stackScale={4}
          verticalSwipe={false}
          horizontalThreshold={SWIPE_THRESHOLD}
          backgroundColor="transparent"
          cardHorizontalMargin={CARD_H_MARGIN}
          cardVerticalMargin={0}
          marginTop={0}
          marginBottom={SCREEN_HEIGHT - deckHeight}
          containerStyle={styles.swiperContainer}
          animateOverlayLabelsOpacity
          overlayLabels={{
            left: {
              title: 'NOPE',
              style: {
                label: {
                  borderWidth: 4,
                  borderColor: C.nope,
                  color: C.nope,
                  borderRadius: Radius.md,
                  paddingHorizontal: 18,
                  paddingVertical: 8,
                  fontSize: 36,
                  fontWeight: '800',
                  letterSpacing: 2,
                  backgroundColor: 'rgba(13,13,13,0.5)',
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  flex: 1,
                  paddingRight: Spacing.xl,
                  transform: [{ rotate: '12deg' }],
                },
              },
            },
            right: {
              title: 'MATCH!',
              style: {
                label: {
                  borderWidth: 4,
                  borderColor: C.like,
                  color: C.like,
                  borderRadius: Radius.md,
                  paddingHorizontal: 18,
                  paddingVertical: 8,
                  fontSize: 36,
                  fontWeight: '800',
                  letterSpacing: 2,
                  backgroundColor: 'rgba(13,13,13,0.5)',
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  flex: 1,
                  paddingLeft: Spacing.xl,
                  transform: [{ rotate: '-12deg' }],
                },
              },
            },
          }}
        />
        )}
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
          setCardIndex(0);
          loadMovies();
        }}
      />

      {/* Action buttons */}
      <View style={styles.actions}>
        {/* Nope */}
        <Pressable
          onPress={() => swiperRef.current?.swipeLeft()}
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
            if (topMovie) setSheetMovie(topMovie);
          }}>
          <Ionicons name="information-circle-outline" size={22} color={C.textSecondary} />
        </Pressable>

        {/* Like */}
        <Pressable
          onPress={() => swiperRef.current?.swipeRight()}
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
    marginBottom: Spacing.md,
  },
  swiperContainer: {
    backgroundColor: 'transparent',
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
