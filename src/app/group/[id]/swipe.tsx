import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { Fonts, FontSize, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { getPopularMovies } from '@/services/tmdb';
import { getGroupSwipedMovieIds, saveGroupSwipe } from '@/services/groups';
import type { Movie } from '@/types/tmdb';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const CARD_H_MARGIN = Spacing.lg;
const STACK_SIZE = 3;

/**
 * Swipe de groupe — même mécanique que l'onglet Swipe, mais :
 * - le deck vient des films populaires SANS filtres, pour que tous les
 *   membres du groupe voient le même pool de films ;
 * - les swipes sont enregistrés dans group_swipes (secrets, RLS) ;
 * - les matchs se révèlent sur l'écran du groupe quand TOUT le monde a liké.
 */
export default function GroupSwipeScreen() {
  const C = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { id: groupId } = useLocalSearchParams<{ id: string }>();

  const [deck, setDeck] = useState<Movie[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [sheetMovie, setSheetMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const page = useRef(1);
  const swipedIds = useRef<Set<number>>(new Set());
  const isFetching = useRef(false);
  const swiperRef = useRef<Swiper<Movie>>(null);
  const [deckHeight, setDeckHeight] = useState(0);

  const gestureX = useSharedValue(0);
  const isLikePressed = useSharedValue(0);
  const isNopePressed = useSharedValue(0);

  // ── Button animations (mêmes que l'onglet Swipe) ───────────────────────────
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
      let fresh: Movie[] = [];
      let attempts = 0;
      while (fresh.length === 0 && attempts < 5) {
        const { results } = await getPopularMovies(page.current);
        page.current += 1;
        fresh = results.filter((m) => !swipedIds.current.has(m.id));
        attempts += 1;
        if (results.length === 0) break;
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
      if (!user || !groupId) return;
      try {
        const ids = await getGroupSwipedMovieIds(groupId, user.id);
        swipedIds.current = new Set(ids);
      } catch {
        // non-blocking
      }
      await loadMovies();
      setLoading(false);
    }
    init();
  }, [user, groupId, loadMovies]);

  const remaining = deck.length - cardIndex;
  useEffect(() => {
    if (!loading && remaining <= STACK_SIZE + 6) loadMovies();
  }, [remaining, loading, loadMovies]);

  // ── Swipe persistence (groupe, secret) ─────────────────────────────────────
  const persistSwipe = useCallback(
    (index: number, action: 'like' | 'dislike') => {
      const movie = deck[index];
      if (!movie || !user || !groupId) return;
      swipedIds.current.add(movie.id);
      saveGroupSwipe(groupId, user.id, movie, action).catch(() => {});
    },
    [deck, user, groupId],
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
      {/* Header — retour vers le groupe + indication du mode secret */}
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: C.primary }]}>Swipe de groupe</Text>
          <View style={styles.secretRow}>
            <Ionicons name="eye-off-outline" size={12} color={C.textMuted} />
            <Text style={[styles.secretText, { color: C.textMuted }]}>
              Tes choix restent secrets
            </Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Card stack */}
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

      {/* Action buttons */}
      <View style={styles.actions}>
        {/* Nope */}
        <Pressable
          onPress={() => swiperRef.current?.swipeLeft()}
          onPressIn={() => { isNopePressed.value = withTiming(1, { duration: 120 }); }}
          onPressOut={() => { isNopePressed.value = withTiming(0, { duration: 200 }); }}>
          <Animated.View style={[styles.actionBtn, nopeButtonStyle]}>
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
          <Animated.View style={[styles.actionBtn, likeButtonStyle]}>
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
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.lg,
    letterSpacing: 0.3,
  },
  secretRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  secretText: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.xs,
  },
  headerSpacer: { width: 24 },

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
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
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
