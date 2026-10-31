// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Cross-platform dialogs (prompt, confirm, menu) and a short message bar with
// an optional action ("Page deleted · Undo"). React Native's Alert does not
// work on desktop/web, so the whole app uses these instead.

import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { create } from 'zustand';

import i18n from '../i18n';
import { RADIUS, SPACING, TOUCH, useTheme } from '../theme';
import { AppText, Button, Icon, type IconName } from './primitives';

export interface MenuItem {
  label: string;
  icon?: IconName;
  /** Icon colour (e.g. folder colours). */
  color?: string;
  danger?: boolean;
  onPress: () => void;
}

type Dialog =
  | {
      kind: 'prompt';
      title: string;
      message?: string;
      initial: string;
      placeholder?: string;
      secure?: boolean;
      resolve: (v: string | null) => void;
    }
  | {
      kind: 'confirm';
      title: string;
      message?: string;
      confirmLabel: string;
      danger: boolean;
      resolve: (v: boolean) => void;
    }
  | { kind: 'menu'; title?: string; items: MenuItem[]; resolve: () => void };

interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  id: number;
}

interface DialogStore {
  dialog: Dialog | null;
  toast: ToastState | null;
  set(d: Dialog | null): void;
  showToast(t: Omit<ToastState, 'id'>): void;
  hideToast(): void;
}

const useDialogStore = create<DialogStore>((set) => ({
  dialog: null,
  toast: null,
  set: (dialog) => set({ dialog }),
  showToast: (t) => set({ toast: { ...t, id: Date.now() } }),
  hideToast: () => set({ toast: null }),
}));

export const dialogs = {
  prompt(
    title: string,
    opts: { message?: string; initial?: string; placeholder?: string; secure?: boolean } = {},
  ): Promise<string | null> {
    return new Promise((resolve) =>
      useDialogStore.getState().set({ kind: 'prompt', title, initial: opts.initial ?? '', ...opts, resolve }),
    );
  },
  confirm(
    title: string,
    opts: { message?: string; confirmLabel?: string; danger?: boolean } = {},
  ): Promise<boolean> {
    return new Promise((resolve) =>
      useDialogStore.getState().set({
        kind: 'confirm',
        title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? i18n.t('common.ok'),
        danger: opts.danger ?? false,
        resolve,
      }),
    );
  },
  menu(items: MenuItem[], title?: string): Promise<void> {
    return new Promise((resolve) => useDialogStore.getState().set({ kind: 'menu', title, items, resolve }));
  },
  toast(message: string, action?: { label: string; onPress: () => void }) {
    useDialogStore.getState().showToast({ message, actionLabel: action?.label, onAction: action?.onPress });
  },
};

function PromptBody({ d, close }: { d: Extract<Dialog, { kind: 'prompt' }>; close: () => void }) {
  const t = useTheme();
  const [value, setValue] = useState(d.initial);
  const submit = () => {
    const v = d.secure ? value : value.trim();
    d.resolve(v ? v : null);
    close();
  };
  return (
    <>
      <AppText variant="heading">{d.title}</AppText>
      {d.message ? (
        <AppText secondary style={{ marginTop: SPACING.sm }}>
          {d.message}
        </AppText>
      ) : null}
      <TextInput
        testID="dialog-input"
        autoFocus
        value={value}
        onChangeText={setValue}
        placeholder={d.placeholder}
        placeholderTextColor={t.textSecondary}
        onSubmitEditing={submit}
        selectTextOnFocus
        secureTextEntry={d.secure}
        autoCapitalize={d.secure ? 'none' : 'sentences'}
        style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.background }]}
      />
      <View style={styles.actions}>
        <Button
          variant="ghost"
          label={i18n.t('common.cancel')}
          onPress={() => {
            d.resolve(null);
            close();
          }}
        />
        <Button testID="dialog-ok" label={i18n.t('common.ok')} onPress={submit} />
      </View>
    </>
  );
}

export function DialogHost() {
  const t = useTheme();
  const { dialog, toast, set, hideToast } = useDialogStore();
  const close = () => set(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hideToast, toast.actionLabel ? 6000 : 3000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, hideToast]);

  const dismiss = () => {
    if (!dialog) return;
    if (dialog.kind === 'prompt') dialog.resolve(null);
    if (dialog.kind === 'confirm') dialog.resolve(false);
    if (dialog.kind === 'menu') dialog.resolve();
    close();
  };

  return (
    <>
      <Modal visible={dialog !== null} transparent animationType="fade" onRequestClose={dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismiss}
            accessibilityLabel={i18n.t('common.close')}
          />
          <View style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.border }]} testID="dialog">
            {dialog?.kind === 'prompt' ? <PromptBody key={dialog.title} d={dialog} close={close} /> : null}
            {dialog?.kind === 'confirm' ? (
              <>
                <AppText variant="heading">{dialog.title}</AppText>
                {dialog.message ? (
                  <AppText secondary style={{ marginTop: SPACING.sm }}>
                    {dialog.message}
                  </AppText>
                ) : null}
                <View style={styles.actions}>
                  <Button
                    variant="ghost"
                    label={i18n.t('common.cancel')}
                    onPress={() => {
                      dialog.resolve(false);
                      close();
                    }}
                  />
                  <Button
                    testID="dialog-confirm"
                    variant={dialog.danger ? 'danger' : 'primary'}
                    label={dialog.confirmLabel}
                    onPress={() => {
                      dialog.resolve(true);
                      close();
                    }}
                  />
                </View>
              </>
            ) : null}
            {dialog?.kind === 'menu' ? (
              <ScrollView style={{ maxHeight: 480 }}>
                {dialog.title ? (
                  <AppText variant="heading" style={{ marginBottom: SPACING.sm }} numberOfLines={2}>
                    {dialog.title}
                  </AppText>
                ) : null}
                {dialog.items.map((item) => (
                  <Pressable
                    key={item.label}
                    accessibilityRole="menuitem"
                    onPress={() => {
                      close();
                      dialog.resolve();
                      item.onPress();
                    }}
                    style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: t.surfaceAlt }]}
                  >
                    {item.icon ? (
                      <Icon name={item.icon} color={item.color ?? (item.danger ? t.danger : t.text)} />
                    ) : null}
                    <AppText style={{ marginLeft: SPACING.md, color: item.danger ? t.danger : t.text }}>
                      {item.label}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {toast ? (
        <View pointerEvents="box-none" style={styles.toastWrap}>
          <View
            style={[styles.toast, { backgroundColor: t.overlay }]}
            accessibilityLiveRegion="polite"
            testID="toast"
          >
            <AppText style={{ color: '#FFFFFF', flexShrink: 1 }}>{toast.message}</AppText>
            {toast.actionLabel ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  toast.onAction?.();
                  hideToast();
                }}
                style={styles.toastAction}
              >
                <AppText style={{ color: t.scheme === 'dark' ? t.primary : '#F2C08A', fontWeight: '700' }}>
                  {toast.actionLabel}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    minHeight: TOUCH + 4,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm, marginTop: SPACING.xl },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH + 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SPACING.xxl,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    minHeight: TOUCH + 4,
    maxWidth: 560,
    gap: SPACING.md,
  },
  toastAction: { minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: SPACING.sm },
});
