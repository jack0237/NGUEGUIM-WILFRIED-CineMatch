# Document de réflexion globale — CineMatch
**NGUEGUIM Wilfreid · Sujet 1 CineMatch · M1 React Native · SUP de Vinci · Solo**

---

## Partie A — Contribution au projet

### Périmètre

Travaillant seul, j'ai réalisé l'intégralité de l'application : conception de l'architecture, intégration des API, persistance Supabase, UI, CI/CD et déploiement.

### Fonctionnalités développées

**Socle technique**
Mise en place d'un monorepo Expo SDK 56 avec Expo Router v4 (file-based routing), TypeScript strict, et un design system maison basé sur les tokens Stitch M3 (`Cinema`, `CinemaLight`, `Fonts`, `Spacing`, `Radius`) centralisés dans `src/constants/theme.ts`. Tous les écrans utilisent ce système — aucune couleur ou taille n'est codée en dur.

**Authentification complète**
Inscription et connexion via Supabase Auth (email + mot de passe), déconnexion, mot de passe oublié. Auth guard dans `_layout.tsx` via `useSegments` + `useRouter` + listener `onAuthStateChange` : redirection automatique selon l'état de session. Correction en fin de projet du flow de confirmation email : le lien renvoyait vers `localhost:3000` (Site URL par défaut Supabase). Fix : ajout de `emailRedirectTo: 'cinematch://auth/callback'` dans `signUp`, création du screen `(auth)/callback.tsx` qui parse le hash du deep link et appelle `supabase.auth.setSession()`, exclusion de la route callback de l'auth guard.

**Écran Swipe**
Intégration de `react-native-deck-swiper` pour la pile de cartes. Les boutons LIKE/NOPE sont animés en temps réel via un `useSharedValue` Reanimated (`gestureX`) mis à jour dans le callback `onSwiping` de la lib — `interpolate` et `interpolateColor` pilotent scale, background et couleur de l'icône simultanément. Rotation des cartes configurée via les props natifs de la lib (`inputRotationRange`, `outputRotationRange` ±15°, spring physics `topCardResetAnimationFriction/Tension`). Infinite scroll : rechargement automatique quand moins de 9 cartes restent. Filtres par genre, score TMDB minimum et époque via un `FilterSheet` partagé avec la Recherche.

**Feature Group Matching — cœur du sujet**
Identifiée comme non implémentée en cours de projet (la feature centrale du cahier des charges : swiper en secret, révéler les films communs). Réalisée de A à Z :
- **Base de données** : 3 tables (`groups`, `group_members`, `group_swipes`) avec RLS strict — chaque membre ne voit que ses propres swipes. La révélation passe par la RPC `get_group_matches` (SECURITY DEFINER) qui calcule l'intersection via `HAVING count(distinct user_id) = count(membres)`.
- **Service layer** (`src/services/groups.ts`) : `createGroup`, `joinGroup`, `leaveGroup`, `getMyGroups`, `getGroupMatches`, `saveGroupSwipe`.
- **UI** : 3 écrans — liste des groupes (onglet dédié), détail du groupe (code d'invitation partage natif, membres, grille des matchs), swipe secret de groupe (même mécanique que le swipe solo, header "Tes choix restent secrets").

**Autres écrans**
Matches (grille 2 colonnes, tri note/récent/genre), Fiche film (`Promise.all` parallèle sur 3 endpoints TMDB : détails, crédits, vidéos), Recherche (debounce 400 ms via `use-debounce`, spinner inline), Historique (masqué de la tab bar, accessible via `router.push`), Profil.

**CI/CD**
Pipeline GitHub Actions : build APK Android via EAS Build à chaque push sur `main`, release GitHub automatique avec upload de l'APK.

---

### Difficultés rencontrées et solutions

| Problème | Diagnostic | Solution |
|---|---|---|
| `StyleSheet.absoluteFillObject` — erreur TypeScript | Supprimé en React Native 0.85 | Remplacé par `StyleSheet.absoluteFill` (3 fichiers) |
| Route "unmatched" sur `group/[id]/` à l'exécution | Expo Router exige un `_layout.tsx` dans chaque dossier de route | Création de `src/app/group/[id]/_layout.tsx` avec `<Stack>` |
| Récursion infinie dans les politiques RLS | La politique `groups` appelait `group_members`, elle-même soumise à une politique qui re-vérifiait `groups` | Fonction helper `is_group_member()` en `SECURITY DEFINER` avec `set search_path = ''` |
| Rotation carte saccadée | `react-native-deck-swiper` gère ses propres `Animated.Value` RN — ajouter des transforms Reanimated par-dessus crée des conflits | Utilisation des props intégrés de la lib (`inputRotationRange`, spring) sans Reanimated |
| `color: string` non assignable à `ColorValue` dans `TabIcon` | Typage plus strict de React Native 0.85 | Import de `ColorValue` depuis `react-native`, mise à jour du type du composant |
| Lien confirmation email → `localhost:3000` | Site URL Supabase non configurée, `emailRedirectTo` absent | `emailRedirectTo: 'cinematch://auth/callback'` + screen callback + config dashboard Supabase |

### Ce que j'aurais fait différemment

- **Identifier le group matching dès la semaine 1** : c'est le cœur du cahier des charges, j'aurais dû partir de là plutôt de l'ajouter en cours de route.
- **Configurer l'email confirmation dès la mise en place de l'auth** : problème de `localhost:3000` prévisible, évitable en lisant la doc Supabase dès le départ.
- **Écrire des tests d'intégration** pour le service layer Supabase — les RPCs de groupe ont nécessité plusieurs itérations que des tests auraient pu accélérer.

---

## Partie B — Mon utilisation de l'IA

### Outil utilisé

**Claude (claude.ai) — extension Claude Code dans VS Code**. Utilisé tout au long du projet, principalement pour débloquer des problèmes techniques précis et pour la génération du schéma Supabase.

---

### Exemples concrets de prompts et résultats

**Exemple 1 — Schéma Supabase group matching**

> *Prompt :* « Crée les tables Supabase pour un système de group matching : des groupes d'amis swipent des films en secret, l'app révèle uniquement les films likés par tous les membres. La politique RLS doit être stricte — un membre ne doit jamais pouvoir lire les swipes des autres via l'API REST. »

*Résultat :* SQL complet en une passe — 3 tables, 5 RPCs, RLS sur les 3 tables dont la politique "secret" sur `group_swipes`. Un problème de récursion RLS non anticipé a nécessité une correction (ajout de la fonction `is_group_member` en SECURITY DEFINER). La structure était correcte ; c'est la subtilité Supabase sur les politiques récursives qui a demandé un aller-retour.

**Exemple 2 — Débogage erreur runtime Expo Router**

> *Prompt :* « Je tombe sur "unmatched route, page could not be found" quand je navigue vers `/group/[id]`. La route est déclarée dans le Stack root, les fichiers `index.tsx` et `swipe.tsx` existent dans `src/app/group/[id]/`. »

*Résultat :* Diagnostic immédiat — absence de `_layout.tsx` dans le dossier `group/[id]/`. Expo Router v4 exige ce fichier pour reconnaître un dossier comme segment de route valide, même si les fichiers enfants existent. Créé en 30 secondes, problème résolu.

**Exemple 3 — Fix email confirmation**

> *Prompt :* « Lors de la création d'un compte, le lien de confirmation email redirige vers localhost:3000 au lieu de l'app. »

*Résultat :* Diagnostic en deux niveaux : (1) la "Site URL" du projet Supabase est `localhost:3000` par défaut, (2) le `signUp` ne passait pas de `emailRedirectTo`. Solution : ajout de `options: { emailRedirectTo: 'cinematch://auth/callback' }`, création du screen callback qui parse le hash du deep link (`#access_token=...&refresh_token=...`), appel à `supabase.auth.setSession()`, et exclusion de la route callback de l'auth guard pour éviter une redirection circulaire.

**Exemple 4 — Génération code non pertinente**

> *Situation :* Demande d'animation fluide de rotation de carte pendant le swipe.

*Résultat initial :* Claude a proposé de remplacer complètement le système d'animation de `react-native-deck-swiper` par Reanimated. À l'exécution, la carte partait en jitter. *Correction :* la lib gère déjà ses propres `Animated.Value` internes — superposer Reanimated crée des conflits de transforms. Solution retenue : utiliser les props natifs de la lib (`inputRotationRange`, `outputRotationRange`, spring) sans rien ajouter par-dessus.

---

### Ce que l'IA a bien fait

- **Diagnostiquer des erreurs précises** : les messages d'erreur TypeScript ou runtime, une fois soumis, donnaient un diagnostic et un fix en quelques secondes — ce qui m'aurait pris 20-30 minutes de lecture de doc.
- **Générer du code cohérent avec le contexte** : en lui donnant le design system, les types Supabase et les conventions du projet, le code produit s'intégrait sans friction dans l'existant.
- **Anticiper les pièges de sécurité** : sur le schéma Supabase, elle a spontanément signalé les risques SECURITY DEFINER, les politiques UPDATE sans WITH CHECK, et la déprecation de `auth.role()`.

### Ce que l'IA a mal fait

- **Sur-ingénierie** : propositions de solutions complexes là où une solution simple existait (réécriture Reanimated au lieu des props natifs de la lib).
- **Limites sur le runtime réel** : elle ne peut pas tester l'app sur un device. Des bugs visuels ou des comportements gestuels inattendus nécessitent toujours un test manuel.
- **Confiance excessive sur des APIs en évolution** : certaines suggestions sur `eas update` étaient incorrectes (clé `update` invalide dans `eas.json`, flag `--environment` manquant) — la doc officielle reste la référence.

---

### Réflexion personnelle

L'aspect le plus marquant n'est pas la vitesse — c'est que l'IA m'a forcé à **mieux formuler mes problèmes**. Un prompt vague produit une réponse vague. Pour obtenir un résultat utilisable, j'ai dû préciser le contexte, les contraintes, le comportement attendu. C'est exactement ce qu'on fait quand on rédige un ticket ou une spécification technique.

Ce que l'IA n'a pas changé : la nécessité de **comprendre ce qu'on intègre**. En soutenance, je dois expliquer chaque ligne. Le code généré que je n'aurais pas lu et compris m'aurait mis en difficulté. L'IA est un accélérateur, pas un remplaçant de la compréhension.

Ce projet m'a appris à utiliser l'IA comme un pair senior disponible 24h/24 — utile pour débloquer, challenger une approche, ou valider une hypothèse — mais dont les réponses doivent toujours être vérifiées contre la documentation officielle et testées sur le vrai device.
