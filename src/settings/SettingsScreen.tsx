// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isDesktop } from '../platform/desktopBridge';
import { SPACING, useTheme } from '../theme';
import { AppText, ChoiceList, Header, Row, Section, Segmented, Stepper, SwitchRow } from '../ui/primitives';
import { READER_MODES, type AppSettings } from './defaults';
import { useSettings } from './store';

export function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const s = useSettings((st) => st.settings);
  const update = useSettings((st) => st.update);
  const set = (recipe: (d: AppSettings) => void) =>
    update((d) => {
      recipe(d);
      return d;
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right']}>
      <Header title={t('settings.title')} onBack={() => router.back()} backLabel={t('common.back')} />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80, maxWidth: 820, width: '100%', alignSelf: 'center' }}>
        <Section title={t('settings.reading')}>
          <AppText variant="label" style={{ marginTop: SPACING.md }}>
            {t('settings.defaultMode')}
          </AppText>
          <ChoiceList
            value={s.reader.defaultMode}
            onChange={(v) => set((d) => void (d.reader.defaultMode = v))}
            options={READER_MODES.map((m) => ({ value: m, label: t(`reader.modes.${m}`) }))}
          />
        </Section>

        <Section>
          <AppText variant="label" style={{ marginTop: SPACING.md }}>
            {t('settings.transition')}
          </AppText>
          <Segmented
            value={s.reader.transition}
            onChange={(v) => set((d) => void (d.reader.transition = v))}
            options={[
              { value: 'slide', label: t('settings.transitionSlide') },
              { value: 'fade', label: t('settings.transitionFade') },
              { value: 'curl', label: t('settings.transitionCurl') },
            ]}
          />
          <Row
            title={t('settings.transitionMs')}
            right={
              <Stepper
                label={t('settings.transitionMs')}
                value={s.reader.transitionMs}
                min={100}
                max={400}
                step={20}
                format={(v) => t('settings.ms', { value: v })}
                onChange={(v) => set((d) => void (d.reader.transitionMs = v))}
              />
            }
          />
          <AppText variant="label" style={{ marginTop: SPACING.md }}>
            {t('settings.halfPageStyle')}
          </AppText>
          <ChoiceList
            value={s.reader.halfPageStyle}
            onChange={(v) => set((d) => void (d.reader.halfPageStyle = v))}
            options={[
              { value: 'stand', label: t('settings.halfPageStand') },
              { value: 'scroll', label: t('settings.halfPageScroll') },
            ]}
          />
          <Row
            title={t('settings.lookahead')}
            right={
              <Stepper
                label={t('settings.lookahead')}
                value={Math.round(s.reader.lookaheadFraction * 100)}
                min={10}
                max={35}
                step={5}
                format={(v) => t('settings.percent', { value: v })}
                onChange={(v) => set((d) => void (d.reader.lookaheadFraction = v / 100))}
              />
            }
          />
          <Row
            title={t('settings.overlap')}
            right={
              <Stepper
                label={t('settings.overlap')}
                value={Math.round(s.reader.continuousOverlap * 100)}
                min={0}
                max={40}
                step={5}
                format={(v) => t('settings.percent', { value: v })}
                onChange={(v) => set((d) => void (d.reader.continuousOverlap = v / 100))}
              />
            }
            last
          />
        </Section>

        <Section>
          <AppText variant="label" style={{ marginTop: SPACING.md }}>
            {t('settings.twoPageStep')}
          </AppText>
          <Segmented
            value={String(s.reader.twoPage.step) as '1' | '2'}
            onChange={(v) => set((d) => void (d.reader.twoPage.step = v === '1' ? 1 : 2))}
            options={[
              { value: '1', label: t('settings.twoPageStep1') },
              { value: '2', label: t('settings.twoPageStep2') },
            ]}
          />
          <SwitchRow
            title={t('settings.coverAlone')}
            value={s.reader.twoPage.coverAlone}
            onChange={(v) => set((d) => void (d.reader.twoPage.coverAlone = v))}
          />
          <SwitchRow
            title={t('settings.autoTwoPage')}
            value={s.reader.autoTwoPageLandscape}
            onChange={(v) => set((d) => void (d.reader.autoTwoPageLandscape = v))}
            last
          />
        </Section>

        <Section>
          <AppText variant="label" style={{ marginTop: SPACING.md }}>
            {t('settings.tapZones')}
          </AppText>
          <ChoiceList
            value={s.reader.tapZones}
            onChange={(v) => set((d) => void (d.reader.tapZones = v))}
            options={[
              { value: 'thirds', label: t('settings.tapThirds') },
              { value: 'halves', label: t('settings.tapHalves') },
              { value: 'top-bottom', label: t('settings.tapTopBottom') },
            ]}
          />
          <SwitchRow
            title={t('settings.invertZones')}
            value={s.reader.invertTapZones}
            onChange={(v) => set((d) => void (d.reader.invertTapZones = v))}
          />
          <SwitchRow
            title={t('settings.swipe')}
            subtitle={t('settings.swipeHint')}
            value={s.reader.swipeToTurn}
            onChange={(v) => set((d) => void (d.reader.swipeToTurn = v))}
          />
          <SwitchRow
            title={t('settings.doubleTapFullscreen')}
            value={s.reader.doubleTapCenterFullscreen}
            onChange={(v) => set((d) => void (d.reader.doubleTapCenterFullscreen = v))}
          />
          <SwitchRow
            title={t('settings.pageNumberPerformance')}
            value={s.reader.showPageNumberInPerformance}
            onChange={(v) => set((d) => void (d.reader.showPageNumberInPerformance = v))}
          />
          <SwitchRow
            title={t('settings.lockDrawing')}
            value={s.reader.lockDrawingInPerformance}
            onChange={(v) => set((d) => void (d.reader.lockDrawingInPerformance = v))}
            last
          />
        </Section>

        <Section title={t('settings.annotations')}>
          <AppText variant="label" style={{ marginTop: SPACING.md }}>
            {t('settings.inputMode')}
          </AppText>
          <ChoiceList
            value={s.annotations.inputMode === 'auto' ? 'both' : s.annotations.inputMode}
            onChange={(v) => set((d) => void (d.annotations.inputMode = v))}
            options={[
              { value: 'both', label: t('settings.inputBoth'), subtitle: t('annotate.fingerHint') },
              { value: 'stylus', label: t('settings.inputStylus'), subtitle: t('annotate.stylusHint') },
              { value: 'finger', label: t('settings.inputFinger') },
              { value: 'off', label: t('settings.inputOff') },
            ]}
          />
        </Section>

        <Section title={t('settings.pedal')}>
          <Row title={t('settings.pedal')} subtitle={t('settings.testKeysHint')} icon="foot-print" onPress={() => router.push('/settings/pedal')} testID="open-pedal" last />
        </Section>

        <Section title={t('settings.thumbnails')}>
          <AppText variant="label" style={{ marginTop: SPACING.md }}>
            {t('settings.thumbSide')}
          </AppText>
          <Segmented
            value={s.thumbnails.side}
            onChange={(v) => set((d) => void (d.thumbnails.side = v))}
            options={[
              { value: 'left', label: t('settings.left') },
              { value: 'right', label: t('settings.right') },
            ]}
          />
          <AppText variant="label">{t('settings.thumbSize')}</AppText>
          <Segmented
            value={s.thumbnails.size}
            onChange={(v) => set((d) => void (d.thumbnails.size = v))}
            options={[
              { value: 'small', label: t('settings.small') },
              { value: 'medium', label: t('settings.medium') },
              { value: 'large', label: t('settings.large') },
            ]}
          />
          <View style={{ height: SPACING.sm }} />
        </Section>

        {isDesktop() ? (
          <Section title={t('settings.library')}>
            <AppText variant="label" style={{ marginTop: SPACING.md }}>
              {t('settings.importMode')}
            </AppText>
            <ChoiceList
              value={s.library.desktopImportMode}
              onChange={(v) => set((d) => void (d.library.desktopImportMode = v))}
              options={[
                { value: 'copy', label: t('settings.importCopy') },
                { value: 'link', label: t('settings.importLink') },
              ]}
            />
          </Section>
        ) : null}

        <Section title={t('settings.appearance')}>
          <AppText variant="label" style={{ marginTop: SPACING.md }}>
            {t('settings.theme')}
          </AppText>
          <Segmented
            testID="theme-choice"
            value={s.theme}
            onChange={(v) => set((d) => void (d.theme = v))}
            options={[
              { value: 'system', label: t('settings.themeSystem') },
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
            ]}
          />
          <AppText variant="label">{t('settings.language')}</AppText>
          <Segmented
            testID="language-choice"
            value={s.language}
            onChange={(v) => set((d) => void (d.language = v))}
            options={[
              { value: 'system', label: t('settings.languageSystem') },
              { value: 'es', label: 'Español' },
              { value: 'en', label: 'English' },
            ]}
          />
          <View style={{ height: SPACING.sm }} />
        </Section>

        <Section>
          <Row title={t('settings.about')} icon="information-outline" onPress={() => router.push('/about')} testID="open-about" last />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
