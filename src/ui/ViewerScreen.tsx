import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import type { Snapshot } from '../core/viewer.ts';
import { SimulatorFeed } from '../sources/simulator.ts';
import { useViewer } from '../useViewer.ts';
import { styles } from './viewerStyles.ts';

const DEMO_DEVICE_ID = 'demo-001';

function readingMessage(state: Snapshot['state']): string {
  switch (state) {
    case 'LIVE':
      return 'Live';
    case 'STALE':
      return 'No recent reading';
    case 'WAITING':
      return 'Waiting for a reading';
    case 'SUSPENDED':
      return 'In the background';
    default:
      return 'Heading unavailable';
  }
}

function HeadingReading({ view }: { view: Snapshot }) {
  const lastUsableUpdate = view.ageMs === null
    ? 'none yet'
    : `${(view.ageMs / 1000).toFixed(1)} s ago`;

  return (
    <View style={styles.reading}>
      {}
      <Text testID="heading-value" style={styles.heading}>
        {view.heading === null ? '—' : `${view.heading.toFixed(1)}°`}
      </Text>
      <Text style={styles.text}>Clockwise from magnetic north</Text>
      <Text accessibilityLiveRegion="polite" style={styles.text}>
        {readingMessage(view.state)}
      </Text>

      <View style={styles.facts}>
        <Text style={styles.text}>Device: {view.deviceId}</Text>
        <Text style={styles.text}>Connection: {view.connection}</Text>
        <Text style={styles.text}>Last usable update: {lastUsableUpdate}</Text>
      </View>
    </View>
  );
}

// wire sim controls to the feed
export function ViewerScreen() {
  // Keep  feed stable across the hook renders
  const feed = useMemo(
    () => new SimulatorFeed(DEMO_DEVICE_ID, () => Crypto.randomUUID()),
    [],
  );
  const view = useViewer(feed, DEMO_DEVICE_ID);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introduction}>
          <Text accessibilityRole="header" style={styles.title}>
            What Direction Is The Guy Facing?
          </Text>
          <Text style={styles.text}>Simulated data</Text>
        </View>

        <HeadingReading view={view} />

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            onPress={() => feed.setScenario('paused')}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Pause samples</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => feed.setScenario('live')}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Resume fresh data</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
