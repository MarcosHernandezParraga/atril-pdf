// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Floating, glassy toolbar of the annotate mode.

import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import type { InputMode } from '../settings/defaults';
import { cardShadow, RADIUS, SPACING, useTheme } from '../theme';
import { Icon, IconButton, type IconName } from '../ui/primitives';
import type { AnnotationTool, ToolState } from './AnnotateView';

const PEN_COLORS = ['#111111', '#D32F2F', '#1565C0', '#2E7D32'];
const HIGHLIGHTER_COLORS = ['#FFEB3B', '#76FF03', '#FF4081', '#40C4FF', '#FFA726'];
const PEN_WIDTHS = [1, 2, 4];

export function AnnotationToolbar({
  tools,
  onChange,
  inputMode,
  onInputMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClose,
  onInsert,
  bottom,
}: {
  tools: ToolState;
  onChange: (t: ToolState) => void;
  inputMode: InputMode;
  onInputMode: (m: InputMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClose: () => void;
  /** Places a small staff or an image on the page (then it can be moved and resized). */
  onInsert: (kind: 'staff' | 'image') => void;
  bottom: number;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const setTool = (tool: AnnotationTool) => onChange({ ...tools, tool });
  const fingerOn = inputMode !== 'stylus';

  const toolButton = (tool: AnnotationTool, icon: IconName, label: string) => {
    const active = tools.tool === tool;
    return (
      <Pressable
        key={tool}
        testID={`tool-${tool}`}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        onPress={() => setTool(tool)}
        style={({ pressed }) => [
          styles.tool,
          {
            backgroundColor: active ? theme.primary : 'transparent',
            transform: [{ scale: pressed ? 0.92 : active ? 1.06 : 1 }],
          },
        ]}
      >
        <Icon name={icon} size={24} color={active ? theme.onPrimary : theme.text} />
        <Text
          style={[styles.toolLabel, { color: active ? theme.onPrimary : theme.textSecondary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const actionButton = (id: string, icon: IconName, label: string, onPress: () => void) => (
    <Pressable
      key={id}
      testID={id}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tool, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
    >
      <Icon name={icon} size={24} color={theme.text} />
      <Text style={[styles.toolLabel, { color: theme.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );

  const colors =
    tools.tool === 'highlighter'
      ? HIGHLIGHTER_COLORS
      : tools.tool === 'eraser' || tools.tool === 'select'
        ? []
        : PEN_COLORS;
  const current =
    tools.tool === 'highlighter'
      ? tools.highlighterColor
      : tools.tool === 'text'
        ? tools.textColor
        : tools.penColor;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(16)}
      exiting={FadeOutDown.duration(150)}
      style={[styles.wrap, { bottom }]}
      pointerEvents="box-none"
      testID="annotation-toolbar"
    >
      <View style={[styles.bar, cardShadow(theme, 3)]}>
        <BlurView intensity={60} tint={theme.glassTint} style={[StyleSheet.absoluteFill, styles.blur]} />
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.blur,
            { backgroundColor: theme.scheme === 'dark' ? 'rgba(30,28,26,0.72)' : 'rgba(255,255,255,0.78)' },
          ]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {toolButton('pen', 'pen', t('annotate.pen'))}
          {toolButton('highlighter', 'marker', t('annotate.highlighter'))}
          {toolButton('eraser', 'eraser', t('annotate.eraser'))}
          {toolButton('text', 'format-text', t('annotate.text'))}
          {toolButton('select', 'cursor-move', t('annotate.select'))}
          {actionButton('insert-staff', 'view-headline', t('annotate.staff'), () => onInsert('staff'))}
          {actionButton('insert-image', 'image-plus', t('annotate.image'), () => onInsert('image'))}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          {colors.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`${t('annotate.color')} ${c}`}
              onPress={() =>
                onChange(
                  tools.tool === 'highlighter'
                    ? { ...tools, highlighterColor: c }
                    : tools.tool === 'text'
                      ? { ...tools, textColor: c }
                      : { ...tools, penColor: c },
                )
              }
              style={[
                styles.swatch,
                {
                  backgroundColor: c,
                  borderColor: c === current ? theme.primary : 'rgba(0,0,0,0.12)',
                  borderWidth: c === current ? 3 : 1,
                },
              ]}
            />
          ))}
          {tools.tool === 'pen'
            ? PEN_WIDTHS.map((wd) => (
                <Pressable
                  key={wd}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('annotate.width')} ${wd}`}
                  onPress={() => onChange({ ...tools, penWidth: wd })}
                  style={[
                    styles.widthBtn,
                    { backgroundColor: tools.penWidth === wd ? theme.surfaceAlt : 'transparent' },
                  ]}
                >
                  <View
                    style={{ width: 22, height: wd * 2 + 1, borderRadius: 4, backgroundColor: theme.text }}
                  />
                </Pressable>
              ))
            : null}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable
            testID="toggle-finger"
            accessibilityRole="switch"
            accessibilityState={{ checked: fingerOn }}
            accessibilityLabel={fingerOn ? t('annotate.fingerOn') : t('annotate.stylusOnly')}
            onPress={() => onInputMode(fingerOn ? 'stylus' : 'both')}
            style={[styles.tool, { backgroundColor: fingerOn ? 'transparent' : theme.accent }]}
          >
            <Icon
              name={fingerOn ? 'gesture-tap' : 'draw-pen'}
              size={24}
              color={fingerOn ? theme.text : '#FFFFFF'}
            />
            <Text
              style={[styles.toolLabel, { color: fingerOn ? theme.textSecondary : '#FFFFFF' }]}
              numberOfLines={1}
            >
              {fingerOn ? t('annotate.fingerOn') : t('annotate.stylusOnly')}
            </Text>
          </Pressable>
          <IconButton
            icon="undo"
            label={t('common.undo')}
            onPress={onUndo}
            disabled={!canUndo}
            testID="annotate-undo"
          />
          <IconButton icon="redo" label={t('common.redo')} onPress={onRedo} disabled={!canRedo} />
          <IconButton
            icon="check-circle"
            label={t('common.done')}
            onPress={onClose}
            color={theme.primary}
            size={30}
            testID="annotate-done"
          />
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: SPACING.sm, right: SPACING.sm, alignItems: 'center' },
  bar: { borderRadius: RADIUS.xl, maxWidth: '100%' },
  blur: { borderRadius: RADIUS.xl, overflow: 'hidden' },
  row: { alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, gap: 2 },
  tool: {
    minWidth: 58,
    minHeight: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  toolLabel: { fontSize: 10.5, fontWeight: '600', marginTop: 1 },
  divider: { width: 1, height: 32, marginHorizontal: SPACING.xs },
  swatch: { width: 30, height: 30, borderRadius: 15, marginHorizontal: 3 },
  widthBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
