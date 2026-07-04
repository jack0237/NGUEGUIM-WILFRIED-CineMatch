import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

interface SwipeCardProps {
  movie: Movie;
}

// Purely presentational — react-native-deck-swiper owns position, rotation,
// stack scaling and the MATCH/NOPE overlays (see overlayLabels in swipe.tsx).
export function SwipeCard({ movie }: SwipeCardProps) {
  const C = useColors();
  const poster = posterUrl(movie.poster_path, 'w500');
  const year = formatYear(movie.release_date);
  const rating = formatRating(movie.vote_average);

  const genreNames = (movie.genre_ids ?? [])
    .slice(0, 2)
    .map((id) => GENRE_NAMES[id])
    .filter(Boolean) as string[];

  return (
    <View style={[styles.card, { backgroundColor: C.surface }]}>
      <Image
        source={poster ? { uri: poster } : require('@/assets/images/icon.png')}
        style={styles.poster}
        contentFit="cover"
        transition={200}
      />

      <View style={styles.ratingBadge}>
        <Ionicons name="star" size={12} color={C.like} />
        <Text style={styles.ratingValue}>{rating}</Text>
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.92)']}
        locations={[0.35, 0.65, 1]}
        style={styles.gradient}
      />

      <View style={styles.info}>
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
      </View>
    </View>
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
    zIndex: 5,
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
});
