import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, FontSize, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import {
  createGroup,
  getMyGroups,
  joinGroup,
  type GroupWithCount,
} from '@/services/groups';

type SheetMode = 'create' | 'join' | null;

// ── GroupCard ─────────────────────────────────────────────────────────────────

function GroupCard({ group, onPress }: { group: GroupWithCount; onPress: () => void }) {
  const C = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: C.surface, borderColor: C.border },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.cardIcon, { backgroundColor: C.primaryDim }]}>
        <Ionicons name="people" size={22} color={C.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: C.textPrimary }]} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={[styles.cardMeta, { color: C.textMuted }]}>
          {group.member_count} membre{group.member_count > 1 ? 's' : ''}
        </Text>
      </View>
      <View style={[styles.codeChip, { backgroundColor: C.chip }]}>
        <Text style={[styles.codeText, { color: C.textSecondary }]}>{group.code}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
    </Pressable>
  );
}

// ── GroupsScreen ──────────────────────────────────────────────────────────────

export default function GroupsScreen() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Sheet state (create / join) ────────────────────────────────────────────
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadGroups = useCallback(() => {
    getMyGroups()
      .then((g) => { setGroups(g); setError(''); })
      .catch(() => setError('Impossible de charger tes groupes.'))
      .finally(() => setLoading(false));
  }, []);

  // Recharge à chaque focus (nouveau membre, groupe quitté…)
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) firstFocusRef.current = false;
      loadGroups();
    }, [loadGroups]),
  );

  function openSheet(mode: Exclude<SheetMode, null>) {
    setFieldValue('');
    setFieldError('');
    setSheetMode(mode);
  }

  async function handleSubmit() {
    const value = fieldValue.trim();
    if (!value) {
      setFieldError(sheetMode === 'create' ? 'Donne un nom à ton groupe.' : 'Entre le code d’invitation.');
      return;
    }
    setSubmitting(true);
    setFieldError('');
    try {
      const group =
        sheetMode === 'create' ? await createGroup(value) : await joinGroup(value);
      setSheetMode(null);
      loadGroups();
      router.push({ pathname: '/group/[id]', params: { id: group.id } });
    } catch {
      setFieldError(
        sheetMode === 'create'
          ? 'Impossible de créer le groupe. Réessaie.'
          : 'Code invalide ou groupe introuvable.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isCreate = sheetMode === 'create';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: C.primary }]}>Groupes</Text>
        <Pressable hitSlop={8} onPress={loadGroups} style={styles.headerBtn}>
          <Ionicons name="refresh-outline" size={22} color={C.primary} />
        </Pressable>
      </View>

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <View style={styles.actionsRow}>
        <Button
          label="Créer un groupe"
          variant="gradient"
          icon="add"
          style={styles.actionBtn}
          onPress={() => openSheet('create')}
        />
        <Button
          label="Rejoindre"
          variant="ghost"
          icon="enter-outline"
          style={styles.actionBtn}
          onPress={() => openSheet('join')}
        />
      </View>

      {/* ── Liste des groupes ──────────────────────────────────────────────── */}
      {loading ? null : error ? (
        <View style={styles.center}>
          <Text style={[styles.feedbackText, { color: C.textMuted }]}>{error}</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={C.textDisabled} />
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
            Aucun groupe pour l&apos;instant
          </Text>
          <Text style={[styles.feedbackText, { color: C.textMuted }]}>
            Crée un groupe, partage le code à tes amis,{'\n'}et swipez en secret pour
            trouver LE film à regarder ensemble.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              onPress={() =>
                router.push({ pathname: '/group/[id]', params: { id: item.id } })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Bottom sheet créer / rejoindre ─────────────────────────────────── */}
      <Modal
        visible={sheetMode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetMode(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetRoot}
        >
          <Pressable
            style={[styles.sheetOverlay, { backgroundColor: C.overlay }]}
            onPress={() => setSheetMode(null)}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: C.surfaceElevated,
                borderColor: C.border,
                paddingBottom: Spacing.xl + insets.bottom,
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: C.surfaceHighest }]} />
            <Text style={[styles.sheetTitle, { color: C.textPrimary }]}>
              {isCreate ? 'Créer un groupe' : 'Rejoindre un groupe'}
            </Text>
            <Text style={[styles.sheetSubtitle, { color: C.textMuted }]}>
              {isCreate
                ? 'Choisis un nom, puis partage le code d’invitation à tes amis.'
                : 'Entre le code à 6 caractères partagé par ton ami.'}
            </Text>

            <Input
              label={isCreate ? 'Nom du groupe' : 'Code d’invitation'}
              value={fieldValue}
              onChangeText={(t) => setFieldValue(isCreate ? t : t.toUpperCase())}
              error={fieldError}
              maxLength={isCreate ? 40 : 6}
              autoCapitalize={isCreate ? 'sentences' : 'characters'}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <Button
              label={isCreate ? 'Créer' : 'Rejoindre'}
              variant="gradient"
              loading={submitting}
              style={styles.sheetSubmit}
              onPress={handleSubmit}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const H_PAD = 20;

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    height: 56,
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize['2xl'],
    letterSpacing: -0.5,
  },
  headerBtn: { padding: 4 },

  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: H_PAD,
    paddingBottom: Spacing.lg,
  },
  actionBtn: { 
    flex: 1,
   },

  listContent: {
    paddingHorizontal: H_PAD,
    paddingBottom: 100,
  },

  // GroupCard
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  cardPressed: { opacity: 0.85 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  cardName: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.base,
  },
  cardMeta: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.sm,
  },
  codeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  codeText: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.xs,
    letterSpacing: 2,
  },

  // Empty / error
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.lg,
    textAlign: 'center',
  },
  feedbackText: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Bottom sheet
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
  },
  sheetTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.xl,
  },
  sheetSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: -Spacing.sm,
  },
  sheetSubmit: { marginTop: Spacing.sm },
});
