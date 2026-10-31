// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { DEFAULT_DEBOUNCE_MS, DEFAULT_KEYMAP, sanitizeKeymap, type KeyMap } from '../core/keymap';
import type { HalfPageStyle, TwoPageOptions, ViewMode } from '../core/navigation';
import type { TapZoneLayout } from '../core/tapZones';
import type { DocumentSort } from '../library/repository';

export type { TapZoneLayout };

export type ThemePreference = 'system' | 'light' | 'dark';
export type LanguagePreference = 'system' | 'es' | 'en';
export type PageTransition = 'slide' | 'fade' | 'curl';
/** View modes offered to the user (horizontal comes with and without animation). */
export type ReaderMode = ViewMode | 'horizontal-animated';
export const READER_MODES: ReaderMode[] = [
  'horizontal',
  'horizontal-animated',
  'half-page',
  'two-page',
  'vertical-lookahead',
  'vertical-continuous',
];
export type DisplayFilter = 'normal' | 'night' | 'sepia';
export type InputMode = 'auto' | 'stylus' | 'finger' | 'both' | 'off';

export interface ReaderSettings {
  defaultMode: ReaderMode;
  transition: PageTransition;
  transitionMs: number;
  halfPageStyle: HalfPageStyle;
  /** Default height of the look-ahead strip when the first system cannot be detected. */
  lookaheadFraction: number;
  /** Overlap kept when turning in vertical continuous mode. */
  continuousOverlap: number;
  twoPage: TwoPageOptions;
  autoTwoPageLandscape: boolean;
  tapZones: TapZoneLayout;
  invertTapZones: boolean;
  swipeToTurn: boolean;
  doubleTapCenterFullscreen: boolean;
  showPageNumberInPerformance: boolean;
  lockDrawingInPerformance: boolean;
  filter: DisplayFilter;
  brightness: number;
  autoCropMargins: boolean;
}

export interface PedalSettings {
  keymap: KeyMap;
  debounceMs: number;
  volumeKeys: boolean;
}

export interface AnnotationSettings {
  inputMode: InputMode;
  palmRejection: boolean;
  penColors: string[];
  highlighterColors: string[];
  penWidths: number[];
}

export interface AppSettings {
  theme: ThemePreference;
  language: LanguagePreference;
  reader: ReaderSettings;
  pedal: PedalSettings;
  annotations: AnnotationSettings;
  thumbnails: { side: 'left' | 'right'; size: 'small' | 'medium' | 'large' };
  library: { view: 'grid' | 'list'; sort: DocumentSort; desktopImportMode: 'copy' | 'link' };
  hints: { performanceExitShown: boolean };
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'system',
  reader: {
    defaultMode: 'horizontal-animated',
    transition: 'curl',
    transitionMs: 260,
    halfPageStyle: 'stand',
    lookaheadFraction: 0.2,
    continuousOverlap: 0.15,
    twoPage: { coverAlone: false, step: 1 },
    autoTwoPageLandscape: false,
    tapZones: 'thirds',
    invertTapZones: false,
    swipeToTurn: true,
    doubleTapCenterFullscreen: true,
    showPageNumberInPerformance: false,
    lockDrawingInPerformance: true,
    filter: 'normal',
    brightness: 1,
    autoCropMargins: false,
  },
  pedal: { keymap: DEFAULT_KEYMAP, debounceMs: DEFAULT_DEBOUNCE_MS, volumeKeys: false },
  annotations: {
    inputMode: 'both',
    palmRejection: true,
    penColors: ['#111111', '#D32F2F', '#1565C0', '#2E7D32'],
    highlighterColors: ['#FFEB3B', '#76FF03', '#FF4081', '#40C4FF', '#FFA726'],
    penWidths: [1, 2, 4],
  },
  thumbnails: { side: 'left', size: 'medium' },
  library: { view: 'grid', sort: 'recent', desktopImportMode: 'copy' },
  hints: { performanceExitShown: false },
};

type Plain = Record<string, unknown>;

function isPlain(v: unknown): v is Plain {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Merges stored values over the defaults, ignoring unknown keys and wrong types. */
export function mergeSettings<T>(defaults: T, stored: unknown): T {
  if (!isPlain(defaults) || !isPlain(stored)) {
    if (stored === undefined) return defaults;
    if (Array.isArray(defaults)) return (Array.isArray(stored) ? stored : defaults) as T;
    return (typeof stored === typeof defaults ? stored : defaults) as T;
  }
  const out: Plain = {};
  for (const key of Object.keys(defaults)) {
    out[key] = mergeSettings((defaults as Plain)[key], stored[key]);
  }
  return out as T;
}

export function sanitizeSettings(stored: unknown): AppSettings {
  const s = mergeSettings(DEFAULT_SETTINGS, stored);
  s.pedal.keymap = sanitizeKeymap(isPlain(stored) && isPlain(stored.pedal) ? stored.pedal.keymap : undefined);
  if (!READER_MODES.includes(s.reader.defaultMode)) s.reader.defaultMode = 'horizontal';
  if (!['slide', 'fade', 'curl'].includes(s.reader.transition)) s.reader.transition = 'slide';
  if (!['recent', 'name', 'added'].includes(s.library.sort)) s.library.sort = 'recent';
  s.reader.transitionMs = Math.max(100, Math.min(400, Math.round(s.reader.transitionMs)));
  s.reader.lookaheadFraction = Math.max(0.1, Math.min(0.35, s.reader.lookaheadFraction));
  s.reader.continuousOverlap = Math.max(0, Math.min(0.5, s.reader.continuousOverlap));
  s.reader.brightness = Math.max(0.3, Math.min(1, s.reader.brightness));
  s.pedal.debounceMs = Math.max(0, Math.min(1000, Math.round(s.pedal.debounceMs)));
  return s;
}
