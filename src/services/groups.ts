import type { Movie } from '@/types/tmdb';
import type { Group, GroupMatch, GroupMemberInfo, SwipeAction } from '@/types/supabase';
import { supabase } from './supabase';

/** Groupe + nombre de membres (pour la liste des groupes). */
export interface GroupWithCount extends Group {
  member_count: number;
}

/** Crée un groupe et inscrit automatiquement le créateur. */
export async function createGroup(name: string): Promise<Group> {
  const { data, error } = await supabase.rpc('create_group', { p_name: name });
  if (error) throw error;
  return data;
}

/** Rejoint un groupe via son code d'invitation (6 caractères). */
export async function joinGroup(code: string): Promise<Group> {
  const { data, error } = await supabase.rpc('join_group', { p_code: code });
  if (error) throw error;
  return data;
}

/** Groupes de l'utilisateur courant (RLS ne retourne que ses groupes). */
export async function getMyGroups(): Promise<GroupWithCount[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*, group_members(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(({ group_members, ...group }) => ({
    ...group,
    member_count: group_members[0]?.count ?? 0,
  }));
}

/** Quitte un groupe (supprime sa propre ligne membership). */
export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

/** Membres du groupe + progression (nb de swipes chacun, jamais leurs choix). */
export async function getGroupMembers(groupId: string): Promise<GroupMemberInfo[]> {
  const { data, error } = await supabase.rpc('get_group_members', {
    p_group_id: groupId,
  });
  if (error) throw error;
  return data ?? [];
}

/** La révélation : films likés par TOUS les membres du groupe. */
export async function getGroupMatches(groupId: string): Promise<GroupMatch[]> {
  const { data, error } = await supabase.rpc('get_group_matches', {
    p_group_id: groupId,
  });
  if (error) throw error;
  return data ?? [];
}

/** Sauvegarde un swipe de groupe (secret — visible par personne d'autre). */
export async function saveGroupSwipe(
  groupId: string,
  userId: string,
  movie: Movie,
  action: SwipeAction,
): Promise<void> {
  const { error } = await supabase.from('group_swipes').upsert(
    {
      group_id: groupId,
      user_id: userId,
      movie_id: movie.id,
      movie_title: movie.title,
      movie_poster_path: movie.poster_path,
      movie_vote_average: movie.vote_average,
      movie_release_date: movie.release_date ?? null,
      movie_genre_ids: movie.genre_ids ?? [],
      action,
    },
    { onConflict: 'group_id,user_id,movie_id' },
  );
  if (error) throw error;
}

/** IDs des films déjà swipés par l'utilisateur dans ce groupe. */
export async function getGroupSwipedMovieIds(
  groupId: string,
  userId: string,
): Promise<number[]> {
  const { data, error } = await supabase
    .from('group_swipes')
    .select('movie_id')
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.movie_id);
}
