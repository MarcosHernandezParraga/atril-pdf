// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Pedal / keyboard settings: assigned keys, learn mode ("press the pedal you
// want to use"), live key test, anti-bounce and Android volume buttons.

import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { assignKey, DEFAULT_KEYMAP, KEY_ACTIONS, removeKey, type KeyAction } from '../core/keymap';
import { supportsVolumeKeys } from '../input/keySource';
import { useRawKeys } from '../input/useReaderKeys';
import { RADIUS, SPACING, useTheme } from '../theme';
import { dialogs } from '../ui/dialogs';
import { AppText, Button, Header, IconButton, Row, Section, Stepper, SwitchRow } from '../ui/primitives';
import { useSettings } from './store';

export function PedalScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const pedal = useSettings((s) => s.settings.pedal);
  const update = useSettings((s) => s.update);
  const [learning, setLearning] = useState<KeyAction | null>(null);
  const [lastKey, setLastKey] = useState<{ key: string; repeat: boolean } | null>(null);

  useRawKeys((ev) => {
    setLastKey({ key: ev.key, repeat: ev.repeat });
    if (learning && !ev.repeat) {
      const action = learning;
      setLearning(null);
      update((s) => ({ ...s, pedal: { ...s.pedal, keymap: assignKey(s.pedal.keymap, action, ev.key) } }));
      dialogs.toast(t('settings.learned', { key: ev.key, action: t(`settings.actions.${action}`) }));
    }
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right']}>
      <Header title={t('settings.pedal')} onBack={() => router.back()} backLabel={t('common.back')} />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80, maxWidth: 820, width: '100%', alignSelf: 'center' }}>
        <Section title={t('settings.testKeys')}>
          <View style={{ paddingVertical: SPACING.lg }} testID="key-test">
            <AppText secondary>{t('settings.testKeysHint')}</AppText>
            <View
              style={{
                marginTop: SPACING.md,
                padding: SPACING.lg,
                borderRadius: RADIUS.md,
                backgroundColor: learning ? theme.dropHighlight : theme.surfaceAlt,
                alignItems: 'center',
              }}
            >
              {learning ? (
                <AppText variant="heading" style={{ textAlign: 'center' }} testID="learn-prompt">
                  {t('settings.learnPrompt', { action: t(`settings.actions.${learning}`) })}
                </AppText>
              ) : (
                <>
                  <AppText variant="caption" secondary>
                    {t('settings.lastKey')}
                  </AppText>
                  <AppText variant="title" testID="last-key">
                    {lastKey ? `${lastKey.key}${lastKey.repeat ? ' ↻' : ''}` : '—'}
                  </AppText>
                  {!lastKey ? <AppText secondary>{t('settings.noKeyYet')}</AppText> : null}
                </>
              )}
            </View>
          </View>
        </Section>

        <Section title={t('settings.keymap')}>
          {KEY_ACTIONS.map((action, i) => (
            <Row
              key={action}
              title={t(`settings.actions.${action}`)}
              last={i === KEY_ACTIONS.length - 1}
              subtitle={pedal.keymap[action].length > 0 ? pedal.keymap[action].join(' · ') : '—'}
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {pedal.keymap[action].length > 0 ? (
                    <IconButton
                      icon="backspace-outline"
                      label={t('common.delete')}
                      onPress={() =>
                        void dialogs.menu(
                          pedal.keymap[action].map((k) => ({
                            label: k,
                            icon: 'close' as const,
                            onPress: () =>
                              update((s) => ({ ...s, pedal: { ...s.pedal, keymap: removeKey(s.pedal.keymap, action, k) } })),
                          })),
                          t('common.delete'),
                        )
                      }
                    />
                  ) : null}
                  <Button
                    testID={`learn-${action}`}
                    variant={learning === action ? 'primary' : 'secondary'}
                    icon="record-circle-outline"
                    label={t('settings.learn')}
                    onPress={() => setLearning(learning === action ? null : action)}
                    style={{ minHeight: 40, paddingHorizontal: SPACING.md }}
                  />
                </View>
              }
            />
          ))}
        </Section>

        <Section>
          <Row
            title={t('settings.debounce')}
            right={
              <Stepper
                label={t('settings.debounce')}
                value={pedal.debounceMs}
                min={0}
                max={600}
                step={50}
                format={(v) => t('settings.ms', { value: v })}
                onChange={(v) => update((s) => ({ ...s, pedal: { ...s.pedal, debounceMs: v } }))}
              />
            }
            last={!supportsVolumeKeys}
          />
          {supportsVolumeKeys ? (
            <SwitchRow
              title={t('settings.volumeKeys')}
              subtitle={t('settings.volumeKeysHint')}
              value={pedal.volumeKeys}
              onChange={(v) => update((s) => ({ ...s, pedal: { ...s.pedal, volumeKeys: v } }))}
              last
            />
          ) : null}
        </Section>

        <Button
          variant="secondary"
          icon="restore"
          label={t('settings.resetKeys')}
          onPress={() => update((s) => ({ ...s, pedal: { ...s.pedal, keymap: DEFAULT_KEYMAP } }))}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
