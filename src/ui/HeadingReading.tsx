import { StyleSheet, View } from 'react-native';
import type { Snapshot } from '../core/viewer.ts';
import { useAppearance } from './AppearanceProvider.tsx';
import { AppText } from './components.tsx';
import { directionName, formatHeading } from './viewerPresentation.ts';

export function HeadingReading({ view }: { view: Snapshot }) {
  const { palette } = useAppearance();
  return (
    <View style={styles.reading}>
      <AppText testID="heading-direction" style={styles.direction}>{directionName(view.heading)}</AppText>
      <AppText testID="heading-value" style={[styles.bearing, { color: palette.colors.accent }]}>
        {formatHeading(view.heading)}
        {view.heading !== null && <AppText style={[styles.degree, { color: palette.colors.accent }]}>°</AppText>}
      </AppText>
      <AppText style={[styles.reference, { color: palette.colors.secondary }]}>Magnetic heading</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  reading: { alignItems: 'center', gap: 2 },
  direction: { fontSize: 27, lineHeight: 36, fontWeight: '500', textAlign: 'center' },
  bearing: {
    fontSize: 76, lineHeight: 90, fontWeight: '300', letterSpacing: -3,
    fontVariant: ['tabular-nums'], textAlign: 'center',
  },
  degree: { fontSize: 42, fontWeight: '300' },
  reference: { fontSize: 12, lineHeight: 18 },
});
