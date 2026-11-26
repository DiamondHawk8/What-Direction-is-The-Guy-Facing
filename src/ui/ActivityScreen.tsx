import { ScrollView, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import Svg, { Line, Polyline } from 'react-native-svg';
import type { Activity } from '../core/activity.ts';
import { DIRECTION_LABELS, favoriteDirection } from '../core/activity.ts';
import { useAppearance } from './AppearanceProvider.tsx';
import { AppText, Button, commonStyles, SectionTitle } from './components.tsx';

function HistoryChart({ headings }: { headings: number[] }) {
  const { palette } = useAppearance();
  // Break at north instead of drawing a false full rotation from 359° to 0°.
  const paths: string[][] = [[]];
  headings.forEach((heading, index) => {
    if (index > 0 && Math.abs(heading - headings[index - 1]) > 180) paths.push([]);
    const x = 8 + index / Math.max(1, headings.length - 1) * 284;
    const y = 112 - heading / 360 * 100;
    paths[paths.length - 1].push(x + ',' + y);
  });
  return (
    <Svg width="100%" height={125} viewBox="0 0 300 125" aria-hidden>
      {[12, 62, 112].map(y => (
        <Line key={y} x1={8} x2={292} y1={y} y2={y} stroke={palette.colors.border} />
      ))}
      {paths.map((points, index) => (
        <Polyline key={index} points={points.join(' ')} fill="none" stroke={palette.colors.accent} strokeWidth={2} />
      ))}
    </Svg>
  );
}

export function ActivityScreen({ activity, onReset, renderDetails = details => details }: {
  activity: Activity;
  onReset: () => void;
  renderDetails?: (details: ReactNode) => ReactNode;
}) {
  const { palette } = useAppearance();
  const { colors } = palette;
  return (
    <ScrollView contentContainerStyle={commonStyles.page} testID="activity-page">
      <AppText style={[commonStyles.body, { color: colors.secondary }]}>This app session · Simulated readings</AppText>
      <View style={[styles.summary, { borderColor: colors.border }]}>
        <View style={styles.metric}>
          <SectionTitle>Most faced</SectionTitle>
          <AppText style={[styles.number, { color: colors.accent }]}>{favoriteDirection(activity)}</AppText>
        </View>
        <View style={styles.metric}>
          <SectionTitle>Samples observed</SectionTitle>
          <AppText testID="sample-count" style={styles.number}>{activity.samples}</AppText>
        </View>
      </View>

      {activity.samples === 0 && (
        <AppText style={[commonStyles.body, { color: colors.secondary }]}>Waiting for usable readings. Expired or unavailable readings are not counted.</AppText>
      )}

      {renderDetails(
        <>
          <View style={commonStyles.section}>
            <View style={styles.sectionRow}>
              <SectionTitle>Direction breakdown</SectionTitle>
            </View>
            {activity.bins.map((count, index) => {
              const percentage = activity.samples === 0 ? 0 : Math.round(count / activity.samples * 100);
              return (
                <View key={index} style={styles.barRow} accessible accessibilityLabel={DIRECTION_LABELS[index] + ': ' + percentage + '% of samples'}>
                  <AppText style={styles.barLabel}>{DIRECTION_LABELS[index]}</AppText>
                  <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
                    <View style={[styles.bar, { backgroundColor: colors.accent, width: percentage + '%' }]} />
                  </View>
                  <AppText style={[styles.percentage, { color: colors.secondary }]}>{percentage}%</AppText>
                </View>
              );
            })}
            <AppText style={[styles.note, { color: colors.secondary }]}>Share of observed samples, not time spent facing each direction.</AppText>
          </View>
          <View style={commonStyles.section}>
            <SectionTitle>Last 60 readings</SectionTitle>
            {activity.recent.length > 1 ? (
              <View accessible accessibilityLabel={'Heading history, ' + activity.recent.length + ' readings, latest ' + activity.recent.at(-1)?.toFixed(1) + ' degrees.'}>
                <HistoryChart headings={activity.recent} />
              </View>
            ) : <AppText style={commonStyles.body}>Waiting for more readings.</AppText>}
            <View style={styles.sectionRow}>
              <AppText style={[styles.note, { color: colors.secondary }]}>Older</AppText>
              <AppText style={[styles.note, { color: colors.secondary }]}>Latest · 0–360°</AppText>
            </View>
          </View>
        </>
      )}
      <Button label="Reset session statistics" onPress={onReset} secondary disabled={activity.samples === 0} />
      <AppText style={[styles.note, { color: colors.secondary }]}>Stored in memory only. Closing the app clears this session.</AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, paddingVertical: 20, borderTopWidth: 1, borderBottomWidth: 1 },
  metric: { flex: 1, minWidth: 120, gap: 12 },
  number: { fontSize: 40, lineHeight: 50, fontWeight: '400', fontVariant: ['tabular-nums'] },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 24 },
  barLabel: { width: 26, fontSize: 12 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 3 },
  percentage: { width: 36, textAlign: 'right', fontSize: 12, fontVariant: ['tabular-nums'] },
  note: { fontSize: 12, lineHeight: 18 },
});
