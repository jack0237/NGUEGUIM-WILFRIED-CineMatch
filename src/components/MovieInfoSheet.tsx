import { useEffect, useState } from 'react';
import { setStatusBarHidden } from 'expo-status-bar';
import {
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme';
import type { CastMember, Movie } from '@/types/tmdb';
import {
  backdropUrl,
  formatRating,
  formatRuntime,
  formatYear,
  posterUrl,
  profileUrl,
} from '@/utils/format';
import { getMovieCredits, getMovieDetails, getMovieVideos } from '@/services/tmdb';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.74;
const DISMISS_THRESHOLD = 100;

interface Props {
  movie: Movie | null;
  onClose: () => void;
}

export function MovieInfoSheet({ movie, onClose }: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const [runtime, setRuntime] = useState<number | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [genreNames, setGenreNames] = useState<string[]>([]);

  const sheetY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (movie) {
      setStatusBarHidden(true, 'fade');
      sheetY.value = withSpring(0, { damping: 28, stiffness: 200, overshootClamping: true });
      backdropOpacity.value = withTiming(1, { duration: 280 });
      setRuntime(null);
      setCast([]);
      setTrailerKey(null);
      setGenreNames([]);
      fetchData(movie.id);
    }
  }, [movie?.id]);

  // Restore status bar if component unmounts while sheet is open
  useEffect(() => () => { setStatusBarHidden(false, 'fade'); }, []);

  async function fetchData(id: number) {
    const [detailsRes, creditsRes, videosRes] = await Promise.allSettled([
      getMovieDetails(id),
      getMovieCredits(id),
      getMovieVideos(id),
    ]);
    if (detailsRes.status === 'fulfilled') {
      setRuntime(detailsRes.value.runtime ?? null);
      setGenreNames((detailsRes.value.genres ?? []).map((g) => g.name).slice(0, 3));
    }
    if (creditsRes.status === 'fulfilled') {
      setCast(creditsRes.value.cast.slice(0, 5));
    }
    if (videosRes.status === 'fulfilled') {
      const trailer = videosRes.value.results.find(
        (v) => v.type === 'Trailer' && v.site === 'YouTube',
      );
      setTrailerKey(trailer?.key ?? null);
    }
  }

  function close() {
    setStatusBarHidden(false, 'fade');
    sheetY.value = withTiming(SHEET_HEIGHT, { duration: 300 }, () => runOnJS(onClose)());
    backdropOpacity.value = withTiming(0, { duration: 250 });
  }

  const restoreStatusBar = () => setStatusBarHidden(false, 'fade');

  // Drag handle gesture — drag down to dismiss
  const dragGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) sheetY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD) {
        sheetY.value = withTiming(SHEET_HEIGHT, { duration: 280 }, () => runOnJS(close)());
        backdropOpacity.value = withTiming(0, { duration: 220 });
      } else {
        sheetY.value = withSpring(0, { damping: 28, stiffness: 200, overshootClamping: true });
      }
    });

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));
  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  async function shareMovie() {
    if (!movie) return;
    const year = formatYear(movie.release_date);
    const rating = formatRating(movie.vote_average);
    const url = `https://www.themoviedb.org/movie/${movie.id}`;
    await Share.share({
      title: movie.title,
      message: `${movie.title}${year ? ` (${year})` : ''} — ${rating}/10 sur TMDB\n\n${movie.overview ?? ''}\n\n${url}`,
      url,
    });
  }

  if (!movie) return null;

  const bg = backdropUrl(movie.backdrop_path, 'w780') ?? posterUrl(movie.poster_path, 'w780');
  const year = formatYear(movie.release_date);
  const rating = formatRating(movie.vote_average);

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>

        {/* ── Backdrop ─────────────────────────────────────────────────── */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropAnimStyle]}>
          {bg && (
            <Image source={{ uri: bg }} style={StyleSheet.absoluteFill} contentFit="cover" />
          )}
          <LinearGradient
            colors={['rgba(19,19,19,0.45)', 'transparent', '#131313']}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Tap backdrop to close */}
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <Animated.View style={[styles.topBar, { paddingTop: insets.top + 8, height: 56 + insets.top }, backdropAnimStyle]}>
          <Pressable style={styles.topBtn} onPress={close}>
            <Ionicons name="chevron-back" size={24} color="rgba(203,195,215,0.85)" />
          </Pressable>
          <Pressable style={styles.topBtn} onPress={shareMovie}>
            <Ionicons name="share-outline" size={22} color="rgba(203,195,215,0.85)" />
          </Pressable>
        </Animated.View>

        {/* ── Sheet wrapper (overflow visible for trailer button) ──────── */}
        <Animated.View style={[styles.sheetWrapper, sheetAnimStyle]}>

          {/* Watch Trailer — floating above glass panel (-24px) */}
          {trailerKey ? (
            <Pressable
              style={styles.trailerBtn}
              onPress={() =>
                Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`)
              }>
              <Ionicons name="play" size={16} color={C.primary} />
              <Text style={[styles.trailerBtnText, { color: C.primary }]}>Watch Trailer</Text>
            </Pressable>
          ) : (
            // Placeholder space so sheet layout is stable while loading
            <View style={styles.trailerBtnPlaceholder} />
          )}

          {/* ── Glass panel ──────────────────────────────────────────── */}
          <View style={styles.glassPanel}>

            {/* Drag handle */}
            <GestureDetector gesture={dragGesture}>
              <View style={styles.handleZone}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces>

              {/* Title */}
              <Text style={styles.title} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.8}>{movie.title}</Text>

              {/* Meta row */}
              <View style={styles.metaRow}>
                {runtime != null && (
                  <View style={styles.metaChip}>
                    <Ionicons name="time-outline" size={13} color="rgba(203,195,215,0.8)" />
                    <Text style={styles.metaChipText}>{formatRuntime(runtime)}</Text>
                  </View>
                )}
                <View style={styles.metaChip}>
                  <Ionicons name="star" size={13} color={C.like} />
                  <Text style={[styles.metaChipText, { color: C.like }]}>{rating}</Text>
                </View>
                <Text style={styles.metaYear}>{year}</Text>
              </View>

              {/* Genre chips */}
              {genreNames.length > 0 && (
                <View style={styles.genreRow}>
                  {genreNames.map((name) => (
                    <View key={name} style={styles.genreChip}>
                      <Text style={styles.genreChipText}>{name}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Synopsis */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Synopsis</Text>
                <Text style={styles.synopsis}>{movie.overview || '—'}</Text>
              </View>

              {/* Cast */}
              {cast.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Top Cast</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.castList}>
                    {cast.map((member) => {
                      const photo = profileUrl(member.profile_path);
                      return (
                        <View key={member.id} style={styles.castItem}>
                          <View style={styles.castAvatar}>
                            {photo ? (
                              <Image
                                source={{ uri: photo }}
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                              />
                            ) : (
                              <Ionicons name="person" size={26} color="rgba(149,142,160,0.6)" />
                            )}
                          </View>
                          <Text style={styles.castName} numberOfLines={2}>
                            {member.name}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 8,
    zIndex: 50,
    backgroundColor: 'rgba(19,19,19,0.08)',
  },
  topBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Sheet wrapper ─────────────────────────────────────────────────────────
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT + 52,
  },

  // Watch Trailer button — floats above glass panel
  trailerBtn: {
    position: 'absolute',
    top: 4,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(208,188,255,0.15)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(208,188,255,0.25)',
    // btn-glow
    shadowColor: '#d0bcff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    zIndex: 20,
  },
  trailerBtnPlaceholder: {
    height: 52,
  },
  trailerBtnText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Glass panel ───────────────────────────────────────────────────────────
  glassPanel: {
    flex: 1,
    marginTop: 52,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'rgba(15,15,15,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderBottomWidth: 0,
    overflow: 'hidden',
  },

  // Drag handle
  handleZone: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // ── Scroll content ────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 0,
  },

  title: {
    color: '#e5e2e1',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -0.5,
    marginBottom: 14,
    // text-glow
    textShadowColor: 'rgba(208,188,255,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(32,31,31,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  metaChipText: {
    color: 'rgba(203,195,215,0.85)',
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 0.8,
  },
  metaYear: {
    color: 'rgba(203,195,215,0.6)',
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  genreChip: {
    backgroundColor: 'rgba(15,15,15,0.4)',
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  genreChipText: {
    color: '#e5e2e1',
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#e5e2e1',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    marginBottom: 10,
  },
  synopsis: {
    color: 'rgba(203,195,215,0.88)',
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 24,
  },

  // ── Cast ──────────────────────────────────────────────────────────────────
  castList: {
    gap: 16,
    paddingBottom: 4,
  },
  castItem: {
    alignItems: 'center',
    width: 72,
    gap: 6,
  },
  castAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(32,31,31,0.8)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  castName: {
    color: 'rgba(203,195,215,0.8)',
    fontSize: 10,
    fontWeight: '300',
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
