// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import '../i18n';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useExternalOpen } from '../library/useExternalOpen';
import { initServices } from '../services';
import { useSettings } from '../settings/store';
import { useTheme } from '../theme';
import { DialogHost } from '../ui/dialogs';
import { AppText, Button } from '../ui/primitives';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function ExternalOpenListener() {
  useExternalOpen();
  return null;
}

export default function RootLayout() {
  const theme = useTheme();
  const [state, setState] = useState<'loading' | 'ready' | Error>('loading');
  const loadSettings = useSettings((s) => s.load);

  const boot = () => {
    initServices()
      .then((s) => loadSettings(s.repo))
      .then(() => setState('ready'))
      .catch((e: unknown) => setState(e instanceof Error ? e : new Error(String(e))))
      .finally(() => void SplashScreen.hideAsync().catch(() => undefined));
  };

  useEffect(boot, []); // eslint-disable-line react-hooks/exhaustive-deps
  const retry = () => {
    setState('loading');
    boot();
  };

  const navTheme = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaProvider>
        <ThemeProvider value={{ ...navTheme, colors: { ...navTheme.colors, background: theme.background } }}>
          <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
          {state === 'ready' ? (
            <>
              <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: theme.background } }} />
              <ExternalOpenListener />
            </>
          ) : state === 'loading' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={theme.primary} size="large" />
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
              <AppText variant="heading">⚠︎</AppText>
              <AppText secondary style={{ textAlign: 'center' }}>
                {state.message}
              </AppText>
              <Button label="↻" onPress={retry} />
            </View>
          )}
          <DialogHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
