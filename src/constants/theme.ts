import '@/global.css';

import { Platform } from 'react-native';

// ── Stitch M3 tokens — source of truth (from CineMatch UI Kit / code.html) ────

export const Stitch = {
  // Surfaces
  background:               '#131313',
  surfaceDim:               '#131313',
  surface:                  '#131313',
  surfaceBright:            '#3a3939',
  surfaceContainerLowest:   '#0e0e0e',
  surfaceContainerLow:      '#1c1b1b',
  surfaceContainer:         '#201f1f',
  surfaceContainerHigh:     '#2a2a2a',
  surfaceContainerHighest:  '#353534',

  // On-surface
  onBackground:       '#e5e2e1',
  onSurface:          '#e5e2e1',
  onSurfaceVariant:   '#cbc3d7',
  inverseSurface:     '#e5e2e1',
  inverseOnSurface:   '#313030',
  surfaceTint:        '#d0bcff',

  // Outline
  outline:        '#958ea0',
  outlineVariant: '#494454',

  // Primary — lavender violet
  primary:                '#d0bcff',
  primaryFixed:           '#e9ddff',
  primaryFixedDim:        '#d0bcff',
  primaryContainer:       '#a078ff',
  onPrimary:              '#3c0091',
  onPrimaryFixed:         '#23005c',
  onPrimaryFixedVariant:  '#5516be',
  onPrimaryContainer:     '#340080',
  inversePrimary:         '#6d3bd7',

  // Secondary — mint green
  secondary:              '#4edea3',
  secondaryFixed:         '#6ffbbe',
  secondaryFixedDim:      '#4edea3',
  secondaryContainer:     '#00a572',
  onSecondary:            '#003824',
  onSecondaryFixed:       '#002113',
  onSecondaryContainer:   '#00311f',

  // Tertiary — coral red (used for nope/destructive)
  tertiary:               '#ffb3ad',
  tertiaryFixed:          '#ffdad7',
  tertiaryFixedDim:       '#ffb3ad',
  tertiaryContainer:      '#ff5451',
  onTertiary:             '#68000a',
  onTertiaryFixed:        '#410004',
  onTertiaryContainer:    '#5c0008',

  // Error
  error:            '#ffb4ab',
  errorContainer:   '#93000a',
  onError:          '#690005',
  onErrorContainer: '#ffdad6',
} as const;

// ── Cinema aliases — used throughout the app ───────────────────────────────────

export const Cinema = {
  // Backgrounds
  bg:              Stitch.background,              // #131313
  bgAlt:           Stitch.surfaceContainerLowest,  // #0e0e0e
  surface:         Stitch.surfaceContainerLow,     // #1c1b1b
  surfaceElevated: Stitch.surfaceContainer,        // #201f1f
  chip:            Stitch.surfaceContainerHigh,    // #2a2a2a
  surfaceHighest:  Stitch.surfaceContainerHighest, // #353534

  // Brand — primary violet
  primary:         Stitch.primary,           // #d0bcff  (links, active states, selection)
  primaryDark:     Stitch.inversePrimary,    // #6d3bd7
  primaryLight:    Stitch.primaryFixed,      // #e9ddff
  primaryDim:      'rgba(208,188,255,0.15)',

  // Button gradient pair
  gradientFrom:    Stitch.primaryContainer,  // #a078ff
  gradientTo:      Stitch.inversePrimary,    // #6d3bd7
  onGradient:      '#FFFFFF',

  // Ratings
  gold:    '#F5C518',
  goldDim: 'rgba(245,197,24,0.15)',

  // Swipe feedback
  like:    Stitch.secondary,     // #4edea3
  likeDim: 'rgba(78,222,163,0.15)',
  nope:    Stitch.tertiary,      // #ffb3ad
  nopeDim: 'rgba(255,179,173,0.15)',

  // Text
  textPrimary:   Stitch.onBackground,      // #e5e2e1
  textSecondary: Stitch.onSurfaceVariant,  // #cbc3d7
  textMuted:     Stitch.outline,           // #958ea0
  textDisabled:  Stitch.outlineVariant,    // #494454

  // Borders & overlays
  border:       Stitch.outlineVariant, // #494454
  borderLight:  Stitch.outline,        // #958ea0
  overlay:      'rgba(0,0,0,0.75)',
  overlayLight: 'rgba(0,0,0,0.45)',

  // Chips
  chipActive:     Stitch.primaryContainer, // #a078ff
  chipText:       Stitch.onSurfaceVariant, // #cbc3d7
  chipTextActive: '#FFFFFF',

  // Tab bar
  tabBar:         Stitch.background,            // #131313
  tabBarBorder:   Stitch.surfaceContainerLow,   // #1c1b1b
  tabBarActive:   Stitch.onBackground,          // #e5e2e1
  tabBarInactive: Stitch.outlineVariant,        // #494454
} as const;

// ── Cinema light palette — light-mode equivalent of Cinema ────────────────────

export const CinemaLight = {
  // Backgrounds
  bg:              '#F5F5F7',
  bgAlt:           '#EBEBF0',
  surface:         '#FFFFFF',
  surfaceElevated: '#F2F2F7',
  chip:            '#E5E5EA',
  surfaceHighest:  '#D1D1D6',

  // Brand — primary violet (darker for light mode)
  primary:         Stitch.inversePrimary,     // #6d3bd7
  primaryDark:     '#5016c4',
  primaryLight:    '#9b6ee7',
  primaryDim:      'rgba(109,59,215,0.12)',

  // Button gradient pair — darker in light mode for white text readability (~6:1 contrast)
  gradientFrom:    Stitch.inversePrimary,     // #6d3bd7
  gradientTo:      '#4a27bd',                 // deeper purple
  onGradient:      '#FFFFFF',

  // Ratings
  gold:    '#B8860B',
  goldDim: 'rgba(184,134,11,0.12)',

  // Swipe feedback (darker for legibility on light bg)
  like:    '#00875a',
  likeDim: 'rgba(0,135,90,0.12)',
  nope:    '#c0392b',
  nopeDim: 'rgba(192,57,43,0.12)',

  // Text
  textPrimary:   '#0D0D0D',
  textSecondary: '#636366',
  textMuted:     '#8E8E93',
  textDisabled:  '#C7C7CC',

  // Borders & overlays
  border:       '#D1D1D6',
  borderLight:  '#8E8E93',
  overlay:      'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.2)',

  // Chips
  chipActive:     Stitch.inversePrimary,  // #6d3bd7
  chipText:       '#636366',
  chipTextActive: '#FFFFFF',

  // Tab bar
  tabBar:         '#F5F5F7',
  tabBarBorder:   '#E5E5EA',
  tabBarActive:   Stitch.inversePrimary,  // #6d3bd7
  tabBarInactive: '#3C3C3E',
} as const;

export type CinemaPalette = typeof Cinema | typeof CinemaLight;

// ── Theme-variant colors (used by ThemedText / ThemedView via useTheme()) ─────

export const Colors = {
  light: {
    text:               '#0D0D0D',
    background:         '#F5F5F7',
    backgroundElement:  '#E5E5EA',
    backgroundSelected: '#D1D1D6',
    textSecondary:      '#636366',
    primary:            Stitch.inversePrimary, // #6d3bd7 — darker for light mode
    primaryDim:         'rgba(109,59,215,0.12)',
    gold:               '#B8860B',
    surface:            '#FFFFFF',
    surfaceElevated:    '#F2F2F7',
    border:             '#D1D1D6',
    tabBar:             '#F5F5F7',
    tabBarActive:       Stitch.inversePrimary,
    tabBarInactive:     '#8E8E93',
  },
  dark: {
    text:               Stitch.onBackground,          // #e5e2e1
    background:         Stitch.background,            // #131313
    backgroundElement:  Stitch.surfaceContainer,      // #201f1f
    backgroundSelected: Stitch.surfaceContainerHigh,  // #2a2a2a
    textSecondary:      Stitch.onSurfaceVariant,      // #cbc3d7
    primary:            Stitch.primary,               // #d0bcff
    primaryDim:         'rgba(208,188,255,0.15)',
    gold:               '#F5C518',
    surface:            Stitch.surfaceContainerLow,   // #1c1b1b
    surfaceElevated:    Stitch.surfaceContainer,      // #201f1f
    border:             Stitch.outlineVariant,        // #494454
    tabBar:             Stitch.background,            // #131313
    tabBarActive:       Stitch.onBackground,          // #e5e2e1
    tabBarInactive:     Stitch.outlineVariant,        // #494454
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ── Typography ────────────────────────────────────────────────────────────────

export const Fonts = {
  // Sora variants — loaded via useFonts in _layout.tsx
  light:     'Sora-Light',
  regular:   'Sora-Regular',
  semibold:  'Sora-SemiBold',
  bold:      'Sora-Bold',
  extrabold: 'Sora-ExtraBold',
  // System monospace (for ThemedText code type)
  mono: Platform.select({ ios: 'ui-monospace', android: 'monospace', default: 'monospace' }) ?? 'monospace',
} as const;

export const FontSize = {
  xs:      11,
  sm:      13,
  md:      15,
  base:    16,
  lg:      18,
  xl:      20,
  '2xl':   24,
  '3xl':   28,
  '4xl':   32,
  display: 48,
} as const;

export const FontWeight = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
};

// ── Spacing (4-pt grid) ───────────────────────────────────────────────────────

export const Spacing = {
  half: 2,
  one:  4,
  two:  8,
  three: 16,
  four:  24,
  five:  32,
  six:   64,
  // Named aliases
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  '2xl': 32,
  '3xl': 48,
} as const;

// ── Border radius ─────────────────────────────────────────────────────────────

export const Radius = {
  sm:   6,
  md:   10,
  lg:   12,
  xl:   16,
  '2xl': 20,
  pill: 999,
} as const;

// ── Misc ──────────────────────────────────────────────────────────────────────

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
