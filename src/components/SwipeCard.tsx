import { useLayoutEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme';
import type { Movie } from '@/types/tmdb';
import { formatRating, formatYear, posterUrl } from '@/utils/format';

const CARD_BORDER_RADIUS = 24;


const GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie',
  80: 'Crime', 99: 'Documentaire', 18: 'Drame', 10751: 'Famille',
  14: 'Fantastique', 36: 'Histoire', 27: 'Horreur', 10402: 'Musique',
  9648: 'Mystère', 10749: 'Romance', 878: 'Science-Fiction',
  10770: 'Téléfilm', 53: 'Thriller', 10752: 'Guerre', 37: 'Western',
};

interface OverlayProps {
  translateX: SharedValue<number>;
}

function LikeOverlay({ translateX }: OverlayProps) {
  const C = useColors();
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 80], [0, 1], 'clamp'),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlayLike, style]}>
      <View style={[styles.overlayBadge, { borderColor: C.like }]}>
        <Text style={[styles.overlayMatchText, { color: C.like }]}>MATCH!</Text>
      </View>
    </Animated.View>
  );
}

function NopeOverlay({ translateX }: OverlayProps) {
  const C = useColors();
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-80, 0], [1, 0], 'clamp'),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlayNope, style]}>
      <View style={[styles.overlayBadge, styles.overlayBadgeNope, { borderColor: C.nope }]}>
        <Text style={[styles.overlayMatchText, { color: C.nope }]}>NOPE</Text>
      </View>
    </Animated.View>
  );
}

interface SwipeCardProps {
  movie: Movie;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  topCardOpacity: SharedValue<number>;
  bgSwipeProgress: SharedValue<number>;
  isTop: boolean;
  index: number;
}

export function SwipeCard({ movie, translateX, translateY, topCardOpacity, bgSwipeProgress, isTop, index }: SwipeCardProps) {
  const C = useColors();
  const poster = posterUrl(movie.poster_path, 'w500');
  const year = formatYear(movie.release_date);
  const rating = formatRating(movie.vote_average);

  // promoteAnim drives only the info-section opacity fade-in on promotion.
  // Card position/scale is handled separately to avoid worklet re-registration lag.
  const promoteAnim = useSharedValue(isTop ? 1 : 0);
  const wasTopRef = useRef(isTop);

  useLayoutEffect(() => {
    if (isTop && !wasTopRef.current) {
      promoteAnim.value = 0;
      promoteAnim.value = withSpring(1, { damping: 24, stiffness: 180 });
    } else if (!isTop) {
      promoteAnim.value = 0;
    }
    wasTopRef.current = isTop;
  }, [isTop]);

  // Two separate worklets — never read `isTop` inside a worklet to avoid the
  // one-frame lag caused by Reanimated worklet re-registration when a JS closure changes.
  const topCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-200, 0, 200], [-15, 0, 15], 'clamp');
    return {
      opacity: topCardOpacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
      zIndex: 10,
    };
  });

  // bgSwipeProgress (0→1) drives scale independently of translateX so that
  // when translateX resets to 0 after a swipe, the background card eases back
  // to rest via a spring instead of snapping — eliminating the visible pop.
  const bgCardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(bgSwipeProgress.value, [0, 1], [1 - index * 0.04, 1 - (index - 1) * 0.04], 'clamp') },
      { translateY: interpolate(bgSwipeProgress.value, [0, 1], [index * 10, (index - 1) * 10], 'clamp') },
    ],
    zIndex: 10 - index,
  }));

  const infoStyle = useAnimatedStyle(() => ({
    opacity: promoteAnim.value,
  }));

  const genreNames = (movie.genre_ids ?? [])
    .slice(0, 2)
    .map((id) => GENRE_NAMES[id])
    .filter(Boolean) as string[];

  return (
    <Animated.View style={[StyleSheet.absoluteFill, isTop ? topCardStyle : bgCardStyle]}>
      <View style={[
        styles.card,
        { backgroundColor: C.surface },
        isTop && styles.cardTopGlow,
      ]}>
        {/* Poster */}
        <Image
          source={poster ? { uri: poster } : require('@/assets/images/icon.png')}
          style={styles.poster}
          contentFit="cover"
          transition={200}
        />

        {/* Rating badge */}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={C.like} />
          <Text style={styles.ratingValue}>{rating}</Text>
        </View>

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.92)']}
          locations={[0.35, 0.65, 1]}
          style={styles.gradient}
        />

        {/* Movie info — fades in with promotion animation */}
        {isTop && (
          <Animated.View style={[styles.info, infoStyle]}>
            {genreNames.length > 0 && (
              <View style={styles.chips}>
                {genreNames.map((name) => (
                  <View key={name} style={styles.chip}>
                    <Text style={styles.chipText}>{name}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
            <Text style={styles.meta}>{year}</Text>
            {movie.overview ? (
              <Text style={styles.overview} numberOfLines={2}>{movie.overview}</Text>
            ) : null}
          </Animated.View>
        )}

        {/* MATCH / NOPE overlays */}
        {isTop && <LikeOverlay translateX={translateX} />}
        {isTop && <NopeOverlay translateX={translateX} />}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardTopGlow: {
    shadowColor: '#d0bcff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 12,
  },
  poster: {
    ...StyleSheet.absoluteFill,
  },

  ratingBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ratingValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
  },

  info: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    zIndex: 10,
    gap: 4,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 2,
  },
  meta: {
    color: 'rgba(203,195,215,0.8)',
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  overview: {
    color: 'rgba(229,226,225,0.75)',
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: 6,
  },

  overlayLike: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: Spacing.xl,
  },
  overlayNope: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: Spacing.xl,
  },
  overlayBadge: {
    borderWidth: 4,
    borderRadius: Radius.md,
    paddingHorizontal: 18,
    paddingVertical: 8,
    transform: [{ rotate: '-12deg' }],
    backgroundColor: 'rgba(13,13,13,0.5)',
  },
  overlayBadgeNope: {
    transform: [{ rotate: '12deg' }],
  },
  overlayMatchText: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
