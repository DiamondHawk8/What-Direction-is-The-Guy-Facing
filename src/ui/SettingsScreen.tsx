import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { Snapshot } from '../core/viewer.ts';
import type { LayoutId, ThemeId } from '../core/preferences.ts';
import type { MotionProfile } from '../sources/motion.ts';
import { useAppearance } from './AppearanceProvider.tsx';
import { AppText, Button, commonStyles, DetailRow, SectionTitle } from './components.tsx';
import { palettes } from './theme.ts';
import { readingStatus } from './viewerPresentation.ts';

const themeOptions: ThemeId[] = ['ink', 'paper', 'blue'];
const layoutOptions: { id: LayoutId; label: string }[] = [
  { id: 'figure', label: 'Figure' },
  { id: 'compass', label: 'Compass' },
  { id: 'split', label: 'Both' },
];
const motionOptions: { id: MotionProfile; label: string }[] = [
  { id: 'everyday', label: 'Everyday' },
  { id: 'restless', label: 'Restless' },
  { id: 'still', label: 'Still' },
];

type SettingsProps = {
  view: Snapshot;
  profile: MotionProfile;
  onProfile: (profile: MotionProfile) => void;
  onPause: () => void;
  onResume: () => void;
};

export function SettingsScreen({ view, profile, onProfile, onPause, onResume }: SettingsProps) {
  const { palette, preferences, dispatch } = useAppearance();
  const { colors } = palette;
  return (
    <ScrollView contentContainerStyle={commonStyles.page} testID="settings-page">
      <View style={commonStyles.section}>
        <SectionTitle>Appearance</SectionTitle>
        <View style={styles.options}>
          {themeOptions.map(id => {
            const option = palettes[id];
            const selected = preferences.theme === id && palette.name === option.name;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={option.name + ' theme'}
                accessibilityState={{ selected }}
                testID={'theme-' + id}
                onPress={() => dispatch({ type: 'theme', value: id })}
                style={[styles.themeOption, { borderColor: selected ? colors.accent : colors.border }]}
              >
                <View style={[styles.swatch, { backgroundColor: option.colors.background }]}>
                  <View style={[styles.swatchLine, { backgroundColor: option.colors.accent }]} />
                  <View style={[styles.swatchShort, { backgroundColor: option.colors.ink }]} />
                </View>
                <AppText style={styles.optionLabel}>{option.name}{selected ? ' ✓' : ''}</AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={commonStyles.section}>
        <SectionTitle>Viewer layout</SectionTitle>
        <View style={styles.options}>
          {layoutOptions.map(option => (
            <Button
              key={option.id}
              label={option.label}
              testID={'layout-' + option.id}
              secondary={preferences.layout !== option.id}
              selected={preferences.layout === option.id}
              onPress={() => dispatch({ type: 'layout', value: option.id })}
            />
          ))}
        </View>
      </View>

      <View style={[styles.section, { borderColor: colors.border }]}>
        <SectionTitle>Simulator movement</SectionTitle>
        <View style={styles.options}>
          {motionOptions.map(option => (
            <Button
              key={option.id}
              label={option.label}
              testID={'motion-' + option.id}
              secondary={profile !== option.id}
              selected={profile === option.id}
              onPress={() => onProfile(option.id)}
            />
          ))}
        </View>
        <AppText style={[styles.note, { color: colors.secondary }]}>
          {profile === 'everyday' ? 'Holds, quick turns, and small corrections.'
            : profile === 'restless' ? 'More frequent and sharper turns.' : 'A steady bearing with slight sensor noise.'}
        </AppText>
        <View style={styles.options}>
          <Button label="Pause samples" onPress={onPause} secondary disabled={view.connection !== 'connected'} />
          <Button label="Resume samples" onPress={onResume} secondary disabled={view.connection !== 'connected'} />
        </View>
        <AppText accessibilityLiveRegion="polite" style={[styles.note, { color: colors.secondary }]}>{readingStatus(view.state).label}</AppText>
        <AppText style={[styles.note, { color: colors.secondary }]}>Pausing samples expires the heading after three seconds. The connection stays active.</AppText>
      </View>

      <View style={[styles.section, { borderColor: colors.border }]}>
        <SectionTitle>About this prototype</SectionTitle>
        <DetailRow label="Version" value="0.1.0" />
        <DetailRow label="Source" value="Local simulator" />
        <AppText style={[styles.note, { color: colors.secondary }]}>
          Swipe left or right to change pages, or use the bottom tabs. Appearance choices last for this app session only.
        </AppText>
        <Button label="Reset appearance" secondary onPress={() => dispatch({ type: 'reset' })} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeOption: { flex: 1, minWidth: 74, borderWidth: 1.5, borderRadius: 10, padding: 7, gap: 10 },
  swatch: { height: 62, borderRadius: 5, padding: 12, justifyContent: 'center', gap: 7 },
  swatchLine: { width: '60%', height: 5, borderRadius: 2 },
  swatchShort: { width: '40%', height: 3, borderRadius: 2 },
  optionLabel: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingBottom: 3 },
  section: { gap: 12, paddingTop: 22, borderTopWidth: 1 },
  note: { fontSize: 12, lineHeight: 19 },
});
