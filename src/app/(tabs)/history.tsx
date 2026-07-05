import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Fonts, Radius, Spacing, Stitch } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { getAllSwipes } from '@/services/swipe';
import type { SwipeHistory } from '@/types/supabase';
import { posterUrl } from '@/utils/format';
import { GENRE_NAMES } from '@/components/SearchResultCard';
import { HistoryItemSkeleton } from '@/components/skeletons/HistoryItemSkeleton';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS_FR = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'like' | 'dislike';

const CHIPS: { id: Filter; label: string }[] = [
  { id: 'all',     label: 'All Swipes' },
  { id: 'like',    label: 'Liked' },
  { id: 'dislike', label: 'Passed' },
];

// ── HistoryItem ───────────────────────────────────────────────────────────────

function HistoryItem({
  item,
  onPress,
}: {
  item: SwipeHistory;
  onPress: () => void;
}) {
  const C = useColors();
  const isLiked = item.action === 'like';
  const uri = posterUrl(item.movie_poster_path, 'w342') ?? undefined;
  const genre = item.movie_genre_ids[0] ? GENRE_NAMES[item.movie_genre_ids[0]] : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: C.surfaceElevated, borderColor: C.border },
        pressed && { backgroundColor: C.chip },
      ]}
    >
      <View style={[styles.posterWrap, !isLiked && styles.posterWrapPassed]}>
        <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        {!isLiked && <View style={styles.posterGreyOverlay} />}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          locations={[0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.details}>
        <Text
          style={[
            styles.title,
            { color: isLiked ? C.textPrimary : C.textSecondary },
          ]}
          numberOfLines={1}
        >
          {item.movie_title}
        </Text>
        <View style={styles.metaRow}>
          {genre && <Text style={[styles.metaText, { color: C.textMuted }]}>{genre.toUpperCase()}</Text>}
          {genre && <View style={[styles.metaDot, { backgroundColor: C.textDisabled }]} />}
          <Text style={[styles.metaText, { color: C.textMuted }]}>{formatDate(item.swiped_at)}</Text>
        </View>
      </View>

      <View
        style={[
          styles.badge,
          {
            backgroundColor: isLiked ? C.likeDim : C.nopeDim,
          },
        ]}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'close'}
          size={18}
          color={isLiked ? Stitch.secondary : Stitch.error}
        />
      </View>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const C = useColors();
  const router = useRouter();
  const { user } = useAuth();

  const [allSwipes, setAllSwipes] = useState<SwipeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    getAllSwipes(user.id)
      .then(setAllSwipes)
      .catch(() => setError("Impossible de charger l'historique. Vérifie ta connexion."))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const displayed =
    filter === 'all' ? allSwipes : allSwipes.filter(s => s.action === filter);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]} edges={['top']}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color={Stitch.onSurfaceVariant} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.primary }]}>Cinematic History</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
      >
        {CHIPS.map(chip => {
          const active = filter === chip.id;
          return (
            <Pressable
              key={chip.id}
              onPress={() => setFilter(chip.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? `${C.primary}1A` : C.surfaceElevated,
                  borderColor: C.border,
                },
              ]}
            >
              <Text style={[styles.chipLabel, { color: active ? C.primary : Stitch.onSurfaceVariant }]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={{ paddingHorizontal: H_PAD, paddingTop: Spacing.md }}>
          <HistoryItemSkeleton count={6} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={C.textDisabled} />
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>Erreur de chargement</Text>
          <Text style={[styles.emptyText, { color: C.textMuted }]}>{error}</Text>
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="film-outline" size={48} color={C.textDisabled} />
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
            {filter === 'all' ? 'Aucun film swipé' : filter === 'like' ? 'Aucun film aimé' : 'Aucun film passé'}
          </Text>
          <Text style={[styles.emptyText, { color: C.textMuted }]}>
            Lance le swipe pour remplir ton historique.
          </Text>
        </View>
      ) : (
        <FlatList<SwipeHistory>
          style={styles.list}
          data={displayed}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <HistoryItem
              item={item}
              onPress={() => router.push(`/movie/${item.movie_id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const H_PAD = 20;

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: 'flex-start', justifyContent: 'center', padding: 4, marginLeft: -4 },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 28, lineHeight: 36, letterSpacing: -0.3, flex: 1, textAlign: 'center' },
  chipsScroll: { flexGrow: 0 },
  chipsContent: { paddingHorizontal: H_PAD, paddingVertical: Spacing.md, gap: 12 },
  chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.pill, borderWidth: 1 },
  chipLabel: { fontFamily: Fonts.semibold, fontSize: FontSize.sm, letterSpacing: 0.7 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: H_PAD, paddingBottom: 40, gap: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, borderWidth: 1, borderRadius: 24, padding: 12 },
  cardPressed: {},
  posterWrap: { width: 64, height: 96, flexShrink: 0, borderRadius: 8, overflow: 'hidden', backgroundColor: Stitch.surfaceContainerHigh },
  posterWrapPassed: { opacity: 0.7 },
  posterGreyOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(150,150,150,0.25)' },
  details: { flex: 1, minWidth: 0, gap: 6 },
  title: { fontFamily: Fonts.semibold, fontSize: FontSize.xl, lineHeight: 28 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontFamily: Fonts.light, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  metaDot: { width: 4, height: 4, borderRadius: 2 },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: H_PAD },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: FontSize.lg, textAlign: 'center' },
  emptyText: { fontFamily: Fonts.regular, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
});
