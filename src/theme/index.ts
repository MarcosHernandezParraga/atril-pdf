// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { useColorScheme } from 'react-native';

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
  onPrimary: string;
  accent: string;
  danger: string;
  success: string;
  readerBackground: string;
  lookaheadTint: string;
  overlay: string;
  dropHighlight: string;
}

export const LIGHT: Palette = {
  scheme: 'light',
  background: '#F6F1E9',
  surface: '#FFFFFF',
  surfaceAlt: '#EDE5D8',
  border: '#D8CDBD',
  text: '#1E1A16',
  textSecondary: '#5F554B',
  primary: '#8A4B1C',
  onPrimary: '#FFFFFF',
  accent: '#1F5F8B',
  danger: '#B3261E',
  success: '#2E7D32',
  readerBackground: '#D9D4CC',
  lookaheadTint: 'rgba(31, 95, 139, 0.07)',
  overlay: 'rgba(20, 16, 12, 0.88)',
  dropHighlight: 'rgba(138, 75, 28, 0.18)',
};

export const DARK: Palette = {
  scheme: 'dark',
  background: '#14110E',
  surface: '#211C17',
  surfaceAlt: '#2C251F',
  border: '#433930',
  text: '#F3EDE5',
  textSecondary: '#BDB2A6',
  primary: '#E3A35F',
  onPrimary: '#1B1208',
  accent: '#7FB7E0',
  danger: '#F2B8B5',
  success: '#8BD18F',
  readerBackground: '#0D0C0B',
  lookaheadTint: 'rgba(127, 183, 224, 0.10)',
  overlay: 'rgba(12, 10, 8, 0.92)',
  dropHighlight: 'rgba(227, 163, 95, 0.22)',
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const RADIUS = { sm: 6, md: 10, lg: 16 } as const;
/** Minimum touch target (Apple HIG / Material). */
export const TOUCH = 44;

export function useTheme(): Palette {
  const system = useColorScheme();
  const pref = useSettings((s) => s.settings.theme);
  const scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return scheme === 'dark' ? DARK : LIGHT;
}

/** Colour of the folder chips that users can choose. */
export const FOLDER_COLORS = ['#8A4B1C', '#1F5F8B', '#2E7D32', '#B3261E', '#6A1B9A', '#C77700', '#00796B', '#5F554B'];
