// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_AUTHOR, APP_COPYRIGHT, APP_NAME, APP_REPOSITORY_URL, APP_VERSION } from '../config/identity';
import { getDesktopBridge } from '../platform/desktopBridge';
import { SPACING, useTheme } from '../theme';
import { AppText, Header, Row, Section } from '../ui/primitives';
import { THIRD_PARTY } from './thirdParty';

function openUrl(url: string) {
  const bridge = getDesktopBridge();
  if (bridge) void bridge.openExternal(url);
  else void Linking.openURL(url);
}

export function AboutScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right']}>
      <Header title={t('about.title')} onBack={() => router.back()} backLabel={t('common.back')} />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80, maxWidth: 820, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', paddingVertical: SPACING.xl }} testID="about">
          <Image source={require('../../assets/images/icon.png')} style={{ width: 96, height: 96, borderRadius: 22 }} accessibilityIgnoresInvertColors />
          <AppText variant="title" style={{ marginTop: SPACING.md }}>
            {APP_NAME}
          </AppText>
          <AppText secondary>{t('about.version', { version: APP_VERSION })}</AppText>
          <AppText variant="label" style={{ marginTop: SPACING.lg }} testID="about-author">
            {t('about.developedBy', { author: APP_AUTHOR })}
          </AppText>
          <AppText style={{ marginTop: SPACING.md, textAlign: 'center', maxWidth: 520 }}>{t('about.mission')}</AppText>
          <AppText secondary style={{ marginTop: SPACING.md, textAlign: 'center', maxWidth: 520 }}>
            {t('about.privacy')}
          </AppText>
        </View>
        <Section>
          <Row title={t('about.license')} subtitle={APP_COPYRIGHT} icon="scale-balance" />
          <Row title={t('about.sourceCode')} subtitle={APP_REPOSITORY_URL} icon="source-branch" onPress={() => openUrl(APP_REPOSITORY_URL)} last />
        </Section>
        <Section title={t('about.thirdParty')}>
          {THIRD_PARTY.map((p, i) => (
            <Row key={p.name} title={p.name} subtitle={p.license} last={i === THIRD_PARTY.length - 1} />
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
