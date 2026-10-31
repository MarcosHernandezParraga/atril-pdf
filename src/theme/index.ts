// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Visual identity: warm paper tones with a modern, rounded, Apple/Google-like
// design language (large radii, soft shadows, pill buttons, glassy bars).

import { Platform, useColorScheme, type ViewStyle } from 'react-native';

import { useSettings } from '../settings/store';

export interface Palette {
  scheme: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryDeep: string;
  onPrimary: string;
  accent: string;
  danger: string;
  success: string;
  readerBackground: string;
  lookaheadTint: string;
  overlay: string;
  glassTint: 'light' | 'dark';
  dropHighlight: string;
  shadow: string;
}

export const LIGHT: Palette = {
  scheme: 'light',
  background: '#F6F3EE',
  surface: '#FFFFFF',
  surfaceAlt: '#EEE9E1',
  border: 'rgba(60, 48, 36, 0.12)',
  text: '#1D1B18',
  textSecondary: '#6F675E',
  primary: '#B5622A',
  primaryDeep: '#8E4416',
  onPrimary: '#FFFFFF',
  accent: '#2F6FEB',
  danger: '#D93025',
  success: '#2E7D32',
  readerBackground: '#E4E0DA',
  lookaheadTint: 'rgba(47, 111, 235, 0.06)',
  overlay: 'rgba(28, 24, 20, 0.86)',
  glassTint: 'light',
  dropHighlight: 'rgba(181, 98, 42, 0.16)',
  shadow: '#4A3420',
};

export const DARK: Palette = {
  scheme: 'dark',
  background: '#121110',
  surface: '#1E1C1A',
  surfaceAlt: '#2A2724',
  border: 'rgba(255, 245, 235, 0.10)',
  text: '#F5F0EA',
  textSecondary: '#ABA299',
  primary: '#F0A35E',
  primaryDeep: '#C9773A',
  onPrimary: '#1E1206',
  accent: '#7AAEFF',
  danger: '#FF8A80',
  success: '#8BD18F',
  readerBackground: '#0C0B0A',
  lookaheadTint: 'rgba(122, 174, 255, 0.10)',
  overlay: 'rgba(58, 53, 47, 0.97)',
  glassTint: 'dark',
  dropHighlight: 'rgba(240, 163, 94, 0.20)',
  shadow: '#000000',
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const RADIUS = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
/** Minimum touch target (Apple HIG / Material). */
export const TOUCH = 44;

/** Soft, layered shadow like iOS/Material cards. */
export function cardShadow(p: Palette, level: 1 | 2 | 3 = 1): ViewStyle {
  const o = p.scheme === 'dark' ? 0.45 : [0, 0.08, 0.12, 0.18][level]!;
  if (Platform.OS === 'web') {
    return { boxShadow: `0 ${level * 3}px ${level * 10}px rgba(40, 28, 16, ${o})` } as ViewStyle;
  }
  return {
    shadowColor: p.shadow,
    shadowOpacity: o,
    shadowRadius: level * 8,
    shadowOffset: { width: 0, height: level * 3 },
    elevation: level * 3,
  };
}

export function useTheme(): Palette {
  const system = useColorScheme();
  const pref = useSettings((s) => s.settings.theme);
  const scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return scheme === 'dark' ? DARK : LIGHT;
}

/** Colours users can choose for folders. */
export const FOLDER_COLORS = [
  '#B5622A',
  '#2F6FEB',
  '#2E9E5B',
  '#D93025',
  '#8E44AD',
  '#E69B00',
  '#00897B',
  '#5F6B7A',
];
