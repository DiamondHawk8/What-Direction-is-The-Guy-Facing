import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Crypto from 'expo-crypto';
import { SimulatorFeed } from '../sources/simulator.ts';
import type { MotionProfile } from '../sources/motion.ts';
import { useViewer } from '../useViewer.ts';
import { useActivity } from '../useActivity.ts';
import { useAppearance } from './AppearanceProvider.tsx';
import { AppText } from './components.tsx';
import { Icon } from './Icon.tsx';
import { ViewerScreen } from './ViewerScreen.tsx';
import { ActivityScreen } from './ActivityScreen.tsx';
import { SettingsScreen } from './SettingsScreen.tsx';
import { tabs, tabAfterSwipe } from './navigation.ts';

const DEVICE_ID = 'demo-001';

export type AppShellProps = {
  headerAction?: ReactNode;
  renderActivityDetails?: (details: ReactNode) => ReactNode;
};

export function AppShell({ headerAction, renderActivityDetails }: AppShellProps) {
  const { palette } = useAppearance();
  const { colors } = palette;
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState<MotionProfile>('everyday');
  // Navigation and visual previews never restart the source or reset telemetry.
  const feed = useMemo(() => new SimulatorFeed(DEVICE_ID, () => Crypto.randomUUID()), []);
  const view = useViewer(feed, DEVICE_ID);
  const { activity, resetActivity } = useActivity(view);
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.8,
    onPanResponderRelease: (_, gesture) => {
      // React Native reuses gesture state after this callback. Capture values
      // before React runs the state updater.
      const { dx, dy } = gesture;
      setActiveTab(current => tabAfterSwipe(current, dx, dy));
    },
  }), []);

  function changeProfile(next: MotionProfile) {
    feed.setMotionProfile(next);
    setProfile(next);
  }

  return (
    <View style={[styles.backdrop, { backgroundColor: colors.background }]}>
      <StatusBar style={palette.dark ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.shell, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <AppText accessibilityRole="header" style={styles.title}>
            {activeTab === 0 ? 'The Guy' : tabs[activeTab].label}
          </AppText>
          <View style={styles.headerActions}>
            <View style={[styles.demo, { borderColor: colors.border }]}>
              <AppText style={[styles.demoText, { color: colors.secondary }]}>SIMULATOR</AppText>
            </View>
            {headerAction}
          </View>
        </View>

        <View style={styles.content} {...swipe.panHandlers} testID="page-content">
          {activeTab === 0 && <ViewerScreen view={view} />}
          {activeTab === 1 && <ActivityScreen activity={activity} onReset={resetActivity} renderDetails={renderActivityDetails} />}
          {activeTab === 2 && (
            <SettingsScreen
              view={view} profile={profile} onProfile={changeProfile}
              onPause={() => feed.setScenario('paused')}
              onResume={() => feed.setScenario('live')}
            />
          )}
        </View>

        <View style={[styles.tabBar, { borderTopColor: colors.border }]} accessibilityRole="tablist">
          {tabs.map((tab, index) => {
            const selected = index === activeTab;
            const color = selected ? colors.accent : colors.secondary;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={tab.label}
                onPress={() => setActiveTab(index)}
                style={({ pressed }) => [styles.tab, pressed && { opacity: 0.65 }]}
              >
                <Icon name={tab.id} color={color} />
                <AppText style={[styles.tabLabel, { color }]}>{tab.label}</AppText>
                {selected && <View style={[styles.selectedMark, { backgroundColor: color }]} />}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center' },
  shell: { flex: 1, width: '100%', maxWidth: 520 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 18, paddingBottom: 18, gap: 12,
  },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.7, flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  demo: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  demoText: { fontSize: 9, lineHeight: 13, letterSpacing: 1, fontWeight: '600' },
  content: { flex: 1, overflow: 'hidden' },
  tabBar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 },
  tab: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 4, paddingBottom: 5 },
  tabLabel: { fontSize: 10, lineHeight: 15, fontWeight: '600' },
  selectedMark: { width: 3, height: 3, borderRadius: 2, position: 'absolute', bottom: 1 },
});
