import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Snapshot } from '../core/viewer.ts';
import { useAppearance } from './AppearanceProvider.tsx';
import { AppText, commonStyles, DetailRow } from './components.tsx';
import { Compass } from './Compass.tsx';
import { GuyHologram } from './hologram/GuyHologram.tsx';
import { HeadingReading } from './HeadingReading.tsx';
import { formatAge, readingStatus } from './viewerPresentation.ts';

export function ViewerScreen({ view }: { view: Snapshot }) {
  const { palette, preferences } = useAppearance();
  const { height } = useWindowDimensions();
  const { colors } = palette;
  const status = readingStatus(view.state);
  const statusColor = status.tone === 'positive' ? colors.accent
    : status.tone === 'error' ? colors.error
    : status.tone === 'warning' ? colors.warning : colors.secondary;
  const figureHeight = Math.max(170, Math.min(290, height * 0.31));

  return (
    <ScrollView contentContainerStyle={[commonStyles.page, styles.page]} testID="viewer-page">
      <View style={styles.statusRow}>
        <View style={styles.statusLabel}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <AppText accessibilityLiveRegion="polite" style={[styles.statusText, { color: statusColor }]}>
            {status.label}
          </AppText>
        </View>
        <AppText style={[styles.device, { color: colors.secondary }]}>{view.deviceId}</AppText>
      </View>

      <View
        style={[styles.visual, { height: figureHeight }]}
        aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      >
        {preferences.layout !== 'compass' && (
          <View style={preferences.layout === 'split' ? styles.splitFigure : styles.fullFigure} testID="guy-hologram">
            <GuyHologram heading={view.heading} />
          </View>
        )}
        {preferences.layout !== 'figure' && (
          <View style={preferences.layout === 'split' ? styles.splitCompass : styles.fullCompass} testID="compass-widget">
            <Compass heading={view.heading} />
          </View>
        )}
      </View>

      <HeadingReading view={view} />
      <View style={styles.details}>
        <DetailRow label="Connection" value={view.connection} />
        <DetailRow label="Last usable update" value={formatAge(view.ageMs)} />
      </View>
      {view.state !== 'LIVE' && (
        <AppText style={[commonStyles.body, { color: colors.secondary }]}>{status.description}</AppText>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { gap: 18 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  statusLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  device: { fontSize: 12, lineHeight: 18 },
  visual: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  fullFigure: { width: '100%', height: '100%' },
  fullCompass: { height: '95%', aspectRatio: 1 },
  splitFigure: { width: '64%', height: '100%' },
  splitCompass: { width: '36%', aspectRatio: 1 },
  details: { marginTop: 8 },
});
