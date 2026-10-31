// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Basic building blocks shared by every screen: large touch targets (min.
// 44 pt), clear icons with text and good contrast in light and dark themes.

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cardShadow, RADIUS, SPACING, TOUCH, useTheme } from '../theme';
import { Pressable3D } from './Pressable3D';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color?: string }) {
  const t = useTheme();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? t.text} />;
}

type TextVariant = 'title' | 'heading' | 'body' | 'caption' | 'label';

const TEXT_STYLES: Record<TextVariant, TextStyle> = {
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  heading: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 16 },
  caption: { fontSize: 13 },
  label: { fontSize: 15, fontWeight: '600' },
};

export function AppText({
  variant = 'body',
  secondary,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; secondary?: boolean }) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        TEXT_STYLES[variant],
        { color: secondary ? t.textSecondary : t.text },
        style as StyleProp<TextStyle>,
      ]}
    />
  );
}

export function Screen({
  children,
  scroll,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const t = useTheme();
  const body = scroll ? (
    <ScrollView contentContainerStyle={[{ padding: SPACING.lg, paddingBottom: SPACING.xxl }, style]}>
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top', 'left', 'right']}>
      {body}
    </SafeAreaView>
  );
}

export function Button({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled,
  style,
  testID,
  accessibilityHint,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
}) {
  const t = useTheme();
  const bg =
    variant === 'primary'
      ? t.primary
      : variant === 'secondary'
        ? t.surfaceAlt
        : variant === 'danger'
          ? t.danger
          : 'transparent';
  const fg = variant === 'primary' ? t.onPrimary : variant === 'danger' ? '#FFFFFF' : t.text;
  return (
    <Pressable3D
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      tilt={4}
      depth={0.97}
      style={[
        styles.buttonOuter,
        { backgroundColor: bg, opacity: disabled ? 0.45 : 1 },
        variant === 'primary' && cardShadow(t, 2),
        style,
      ]}
      contentStyle={[styles.button, variant === 'ghost' && { paddingHorizontal: SPACING.sm }]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[t.primary, t.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.pill }]}
        />
      ) : null}
      {icon ? <Icon name={icon} size={22} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable3D>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  onLongPress,
  showLabel,
  active,
  color,
  size = 24,
  disabled,
  testID,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  showLabel?: boolean;
  active?: boolean;
  color?: string;
  size?: number;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const fg = color ?? (active ? t.primary : t.text);
  const [tip, setTip] = useState(false);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Touch screens: holding an icon shows its name for a moment.
  const showTipBriefly = () => {
    setTip(true);
    if (tipTimer.current) clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => setTip(false), 1600);
  };
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={() => {
        setTip(false);
        onPress();
      }}
      onLongPress={onLongPress ?? (showLabel ? undefined : showTipBriefly)}
      onHoverIn={() => !showLabel && setTip(true)}
      onHoverOut={() => setTip(false)}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        active && { backgroundColor: t.surfaceAlt },
        pressed && { backgroundColor: t.surfaceAlt, transform: [{ scale: 0.92 }] },
        { opacity: disabled ? 0.4 : 1 },
        style,
      ]}
    >
      <Icon name={icon} size={size} color={fg} />
      {showLabel ? (
        <Text style={[styles.iconLabel, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      {tip && !showLabel ? (
        <View pointerEvents="none" style={styles.tipWrap}>
          <View style={styles.tip} testID="tooltip">
            <Text style={styles.tipText} numberOfLines={1}>
              {label}
            </Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Header({
  title,
  onBack,
  backLabel,
  right,
}: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.background }]}>
      {onBack ? (
        <IconButton icon="arrow-left" label={backLabel ?? 'Back'} onPress={onBack} testID="header-back" />
      ) : null}
      <AppText
        variant="heading"
        style={{ flex: 1, marginLeft: onBack ? SPACING.xs : SPACING.sm }}
        numberOfLines={1}
      >
        {title}
      </AppText>
      {right}
    </View>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: SPACING.xl }}>
      {title ? (
        <AppText
          variant="label"
          secondary
          style={{ marginBottom: SPACING.sm, textTransform: 'uppercase', fontSize: 13 }}
        >
          {title}
        </AppText>
      ) : null}
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, cardShadow(t, 1)]}>
        {children}
      </View>
    </View>
  );
}

export function Row({
  title,
  subtitle,
  icon,
  right,
  onPress,
  testID,
  last,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  right?: ReactNode;
  onPress?: () => void;
  testID?: string;
  last?: boolean;
}) {
  const t = useTheme();
  const content = (
    <>
      {icon ? (
        <View style={{ marginRight: SPACING.md }}>
          <Icon name={icon} color={t.textSecondary} />
        </View>
      ) : null}
      <View style={{ flex: 1, paddingVertical: SPACING.md }}>
        <AppText>{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" secondary style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {onPress && !right ? <Icon name="chevron-right" color={t.textSecondary} /> : null}
    </>
  );
  const style = [
    styles.row,
    !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  ];
  return onPress ? (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [...style, pressed && { backgroundColor: t.surfaceAlt }]}
    >
      {content}
    </Pressable>
  ) : (
    <View testID={testID} style={style}>
      {content}
    </View>
  );
}

export function SwitchRow({
  title,
  subtitle,
  value,
  onChange,
  last,
  testID,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
  testID?: string;
}) {
  const t = useTheme();
  return (
    <Row
      title={title}
      subtitle={subtitle}
      last={last}
      testID={testID}
      right={
        <Switch
          value={value}
          onValueChange={onChange}
          accessibilityLabel={title}
          trackColor={{ true: t.primary, false: t.border }}
          thumbColor={t.surface}
        />
      }
    />
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testID?: string;
}) {
  const t = useTheme();
  return (
    <View
      testID={testID}
      style={[styles.segmented, { borderColor: t.border }]}
      accessibilityRole="radiogroup"
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && { backgroundColor: t.primary }]}
          >
            <Text
              style={{
                color: selected ? t.onPrimary : t.text,
                fontWeight: selected ? '700' : '500',
                textAlign: 'center',
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Choice list shown as rows with a check mark (good for long labels). */
export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; subtitle?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <>
      {options.map((o, i) => (
        <Row
          key={o.value}
          title={o.label}
          subtitle={o.subtitle}
          last={i === options.length - 1}
          onPress={() => onChange(o.value)}
          right={
            <Icon
              name={o.value === value ? 'check-circle' : 'circle-outline'}
              color={o.value === value ? t.primary : t.border}
            />
          }
        />
      ))}
    </>
  );
}

export function Stepper({
  value,
  onChange,
  step,
  min,
  max,
  format,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  format: (v: number) => string;
  label: string;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v / step) * step));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <IconButton
        icon="minus"
        label={`${label} −`}
        onPress={() => onChange(clamp(value - step))}
        disabled={value <= min}
      />
      <AppText variant="label" style={{ minWidth: 72, textAlign: 'center' }} accessibilityLiveRegion="polite">
        {format(value)}
      </AppText>
      <IconButton
        icon="plus"
        label={`${label} +`}
        onPress={() => onChange(clamp(value + step))}
        disabled={value >= max}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  buttonOuter: { borderRadius: RADIUS.pill, minHeight: TOUCH + 4 },
  button: {
    minHeight: TOUCH + 4,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    overflow: 'hidden',
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  iconButton: {
    minWidth: TOUCH,
    minHeight: TOUCH,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  iconLabel: { fontSize: 11, marginTop: 1, fontWeight: '600' },
  tipWrap: {
    position: 'absolute',
    top: '100%',
    left: -80,
    right: -80,
    alignItems: 'center',
    marginTop: 6,
    zIndex: 1000,
  },
  tip: { backgroundColor: 'rgba(20,18,16,0.92)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  tipText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  card: { borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: SPACING.lg },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH + 8 },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    marginVertical: SPACING.sm,
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: TOUCH - 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.pill,
  },
});
