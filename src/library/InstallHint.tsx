// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// On iPhone and iPad, the web version is installed from Safari ("Share" →
// "Add to Home Screen"). Safari does not offer it by itself, so this small card
// explains it once. Other browsers show their own "Install" button.

import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { getDesktopBridge } from '../platform/desktopBridge';
import { useSettings } from '../settings/store';
import { cardShadow, RADIUS, SPACING, useTheme } from '../theme';
import { AppText, Button, Icon } from '../ui/primitives';

/** Safari on iPhone/iPad, not yet opened from the home screen. */
export function isIosBrowserNotInstalled(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || getDesktopBridge()) return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  const installed =
    nav.standalone === true ||
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches === true);
  if (installed) return false;
  const ua = nav.userAgent;
  // iPadOS presents itself as a Mac, but with a touch screen.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1);
}

export function InstallHint() {
  const { t } = useTranslation();
  const theme = useTheme();
  const shown = useSettings((s) => s.settings.hints.installShown);
  const update = useSettings((s) => s.update);
  if (shown || !isIosBrowserNotInstalled()) return null;
  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface }, cardShadow(theme, 1)]}
      testID="install-hint"
    >
      <View style={styles.row}>
        <Icon name="export-variant" color={theme.primary} />
        <AppText variant="label" style={{ marginStart: SPACING.sm, flex: 1 }}>
          {t('library.installTitle')}
        </AppText>
      </View>
      <AppText secondary style={{ marginTop: SPACING.xs }}>
        {t('library.installSteps')}
      </AppText>
      <Button
        label={t('library.installOk')}
        variant="secondary"
        onPress={() => update((s) => ({ ...s, hints: { ...s.hints, installShown: true } }))}
        style={{ marginTop: SPACING.sm, alignSelf: 'flex-start' }}
        testID="install-hint-ok"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
});
