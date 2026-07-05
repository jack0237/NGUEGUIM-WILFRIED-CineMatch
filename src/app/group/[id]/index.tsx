import { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, FontSize, Radius, Spacing, Stitch } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/Button';
import {
  getGroupMatches,
  getGroupMembers,
  getMyGroups,
  leaveGroup,
} from '@/services/groups';
import type { Group, GroupMatch, GroupMemberInfo } from '@/types/supabase';
import { posterUrl } from '@/utils/format';

const H_PAD = 20;
const GAP = Spacing.lg;
const CARD_WIDTH = (Dimensions.get('window').width - H_PAD * 2 - GAP) / 2;

// ── MatchPoster ───────────────────────────────────────────────────────────────

function MatchPoster({ match, onPress }: { match: GroupMatch; onPress: () => void }) {
  const C = useColors();
  const uri = posterUrl(match.movie_poster_path, 'w342');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.matchCard, pressed && styles.pressed]}
    >
      <Image source={uri ?? undefined} style={styles.matchPoster} contentFit="cover" transition={200} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.matchFooter}>
        <Text style={styles.matchTitle} numberOfLines={2}>
          {match.movie_title}
        </Text>
        <View style={styles.matchMeta}>
          <Ionicons name="star" size={13} color={C.like} />
          <Text style={[styles.matchScore, { color: C.like }]}>
            {match.movie_vote_average.toFixed(1)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── GroupDetailScreen ─────────────────────────────────────────────────────────

export default function GroupDetailScreen() {
  const C = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMemberInfo[]>([]);
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Recharge à chaque focus — les matchs peuvent apparaître après un swipe
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let cancelled = false;
      Promise.all([getMyGroups(), getGroupMembers(id), getGroupMatches(id)])
        .then(([myGroups, m, mt]) => {
          if (cancelled) return;
          const g = myGroups.find((x) => x.id === id) ?? null;
          setGroup(g);
          setMembers(m);
          setMatches(mt);
          setError(g ? '' : 'Groupe introuvable.');
        })
        .catch(() => { if (!cancelled) setError('Impossible de charger le groupe.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, [id]),
  );

  async function handleShareCode() {
    if (!group) return;
    await Share.share({
      message:
        `Rejoins mon groupe "${group.name}" sur CineMatch ! ` +
        `Entre le code ${group.code} dans l'onglet Groupes 🍿`,
    });
  }

  function handleLeave() {
    if (!group || !user) return;
    Alert.alert('Quitter le groupe', `Quitter "${group.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveGroup(group.id, user.id);
            router.back();
          } catch {
            Alert.alert('Erreur', 'Impossible de quitter le groupe.');
          }
        },
      },
    ]);
  }

  const leftCol = matches.filter((_, i) => i % 2 === 0);
  const rightCol = matches.filter((_, i) => i % 2 !== 0);
  const soloGroup = members.length < 2;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]} numberOfLines={1}>
          {group?.name ?? 'Groupe'}
        </Text>
        <Pressable hitSlop={8} onPress={handleLeave} style={styles.headerBtn}>
          <Ionicons name="exit-outline" size={22} color={C.textMuted} />
        </Pressable>
      </View>

      {loading ? null : error ? (
        <View style={styles.center}>
          <Text style={[styles.feedbackText, { color: C.textMuted }]}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Code d'invitation ──────────────────────────────────────────── */}
          <Pressable
            onPress={handleShareCode}
            style={({ pressed }) => [
              styles.codeCard,
              { backgroundColor: C.surface, borderColor: C.border },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.codeInfo}>
              <Text style={[styles.codeLabel, { color: C.textMuted }]}>
                Code d&apos;invitation
              </Text>
              <Text style={[styles.codeValue, { color: C.primary }]}>{group?.code}</Text>
            </View>
            <View style={[styles.shareBtn, { backgroundColor: C.primaryDim }]}>
              <Ionicons name="share-social-outline" size={20} color={C.primary} />
            </View>
          </Pressable>

          {/* ── Membres ────────────────────────────────────────────────────── */}
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
            Membres ({members.length})
          </Text>
          <View style={styles.membersList}>
            {members.map((m) => (
              <View
                key={m.user_id}
                style={[styles.memberRow, { backgroundColor: C.surface, borderColor: C.border }]}
              >
                <View style={[styles.memberAvatar, { backgroundColor: C.primaryDim }]}>
                  <Ionicons name="person" size={16} color={C.primary} />
                </View>
                <Text style={[styles.memberName, { color: C.textPrimary }]} numberOfLines={1}>
                  {m.username ?? 'Cinéphile anonyme'}
                  {m.user_id === user?.id ? ' (toi)' : ''}
                </Text>
                <Text style={[styles.memberCount, { color: C.textMuted }]}>
                  {m.swipe_count} swipe{m.swipe_count > 1 ? 's' : ''}
                </Text>
              </View>
            ))}
          </View>

          {/* ── CTA Swiper ─────────────────────────────────────────────────── */}
          <Button
            label="Swiper pour ce groupe"
            variant="gradient"
            icon="albums-outline"
            style={styles.swipeCta}
            onPress={() =>
              router.push({ pathname: '/group/[id]/swipe', params: { id } })
            }
          />

          {/* ── Matchs du groupe ───────────────────────────────────────────── */}
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
            Films qui ont plu à tout le monde
          </Text>

          {soloGroup ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="person-add-outline" size={40} color={C.textDisabled} />
              <Text style={[styles.feedbackText, { color: C.textMuted }]}>
                Tu es seul·e pour l&apos;instant — partage le code{' '}
                <Text style={{ color: C.primary, fontFamily: Fonts.semibold }}>
                  {group?.code}
                </Text>{' '}
                pour que les matchs aient du sens !
              </Text>
            </View>
          ) : matches.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="film-outline" size={40} color={C.textDisabled} />
              <Text style={[styles.feedbackText, { color: C.textMuted }]}>
                Aucun match pour l&apos;instant.{'\n'}
                Chacun swipe en secret — dès qu&apos;un film plaît à{' '}
                <Text style={{ fontFamily: Fonts.semibold, color: C.textSecondary }}>
                  tous les membres
                </Text>
                , il apparaît ici. 🍿
              </Text>
            </View>
          ) : (
            <View style={styles.columns}>
              <View style={styles.column}>
                {leftCol.map((m) => (
                  <MatchPoster
                    key={m.movie_id}
                    match={m}
                    onPress={() => router.push(`/movie/${m.movie_id}`)}
                  />
                ))}
              </View>
              <View style={styles.column}>
                {rightCol.map((m) => (
                  <MatchPoster
                    key={m.movie_id}
                    match={m}
                    onPress={() => router.push(`/movie/${m.movie_id}`)}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    height: 56,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: FontSize.xl,
    textAlign: 'center',
  },
  headerBtn: { padding: 4 },

  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingBottom: 48,
    gap: Spacing.lg,
  },

  // Code card
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  codeInfo: { gap: 2 },
  codeLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.xs,
    letterSpacing: 0.4,
  },
  codeValue: {
    fontFamily: Fonts.extrabold,
    fontSize: FontSize['2xl'],
    letterSpacing: 6,
  },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.lg,
    marginTop: Spacing.sm,
  },

  // Members
  membersList: { gap: Spacing.sm },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: FontSize.md,
  },
  memberCount: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.sm,
  },

  swipeCta: { marginTop: Spacing.sm },

  // Matches grid
  columns: { flexDirection: 'row', gap: GAP },
  column: { flex: 1, gap: GAP },
  matchCard: {
    width: CARD_WIDTH,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  matchPoster: { width: '100%', aspectRatio: 2 / 3 },
  matchFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    gap: 4,
  },
  matchTitle: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.md,
    color: Stitch.onSurface,
    lineHeight: 22,
  },
  matchMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  matchScore: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.xs,
    letterSpacing: 0.3,
  },

  // Feedback
  pressed: { opacity: 0.85 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  emptyBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  feedbackText: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
