import { Children } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import type { TextProps } from 'react-native';
import { useAppearance } from './AppearanceProvider.tsx';

export function AppText({ children, style, ...props }: TextProps) {
  const { palette, formatText } = useAppearance();
  const content = Children.map(children, child =>
    typeof child === 'string' ? formatText(child) : child,
  );
  return <Text {...props} style={[{ color: palette.colors.ink }, style]}>{content}</Text>;
}

export function SectionTitle({ children }: PropsWithChildren) {
  const { palette } = useAppearance();
  return <AppText style={[styles.sectionTitle, { color: palette.colors.secondary }]}>{children}</AppText>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  selected?: boolean;
  testID?: string;
};

export function Button({ label, onPress, secondary, disabled, selected, testID }: ButtonProps) {
  const { palette } = useAppearance();
  const { colors } = palette;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: secondary ? colors.surfaceMuted : colors.accent },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 },
      ]}
    >
      <AppText style={[styles.buttonText, { color: secondary ? colors.ink : colors.onAccent }]}>{label}</AppText>
    </Pressable>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  const { palette } = useAppearance();
  return (
    <View style={[styles.detailRow, { borderBottomColor: palette.colors.border }]}>
      <AppText style={{ color: palette.colors.secondary, fontSize: 13 }}>{label}</AppText>
      <AppText style={styles.detailValue}>{value}</AppText>
    </View>
  );
}

export const commonStyles = StyleSheet.create({
  page: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 28, gap: 22 },
  heading: { fontSize: 30, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  body: { fontSize: 14, lineHeight: 21 },
  section: { gap: 12 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 12, lineHeight: 18, fontWeight: '600', letterSpacing: 0.5 },
  button: {
    minHeight: 46, paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  buttonText: { fontSize: 13, lineHeight: 20, fontWeight: '600' },
  detailRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    gap: 8, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailValue: { fontSize: 13, fontVariant: ['tabular-nums'] },
});
