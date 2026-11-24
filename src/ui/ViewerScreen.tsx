import { useMemo } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import type { Snapshot } from '../core/viewer.ts';
import { SimulatorFeed } from '../sources/simulator.ts';
import { useViewer } from '../useViewer.ts';
import { Compass } from './Compass.tsx';
import { GuyHologram } from './hologram/GuyHologram.tsx';
import { styles } from './viewerStyles.ts';

const DEMO_DEVICE_ID = 'demo-001';
const cardinalDirections = [
  'North',
  'Northeast',
  'East',
  'Southeast',
  'South',
  'Southwest',
  'West',
  'Northwest',
];

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

type HeadingReadingProps = Pick<Snapshot, 'heading' | 'state'> & {
  compact: boolean;
};

function HeadingReading({ heading, state, compact }: HeadingReadingProps) {
  let directionLabel = 'Magnetic heading';

  if (heading !== null) {
    const nearestSector = Math.round(heading / 45);
    const direction = cardinalDirections[nearestSector % cardinalDirections.length];
    directionLabel = `${direction} (magnetic)`;
  }

  return (
    <View style={[styles.reading, compact && styles.compactReading]}>
      <View
        style={[styles.compass, compact && styles.compactCompass]}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Compass heading={heading} />
      </View>
      <View style={styles.headingDetails}>
        <Text testID="heading-value" style={[styles.heading, compact && styles.compactHeading]}>
          {heading === null ? '—' : `${heading.toFixed(1)}°`}
        </Text>
        <Text style={styles.readingText}>{directionLabel}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.readingText}>
          {readingMessage(state)}
        </Text>
      </View>
    </View>
  );
}

// wire sim controls to the feed
export function ViewerScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 740;
  // Keep  feed stable across the hook renders
  const feed = useMemo(
    () => new SimulatorFeed(DEMO_DEVICE_ID, () => Crypto.randomUUID()),
    [],
  );
  const view = useViewer(feed, DEMO_DEVICE_ID);
  const lastUsableUpdate = view.ageMs === null
    ? 'none yet'
    : `${(view.ageMs / 1000).toFixed(1)} s ago`;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introduction}>
          <Text accessibilityRole="header" style={styles.title}>
            What Direction Is The Guy Facing?
          </Text>
          <Text style={styles.text}>Simulated data</Text>
        </View>

        <View style={styles.instrument}>
          <View
            style={styles.hologram}
            testID="guy-hologram"
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <GuyHologram heading={view.heading} />
          </View>
          <HeadingReading heading={view.heading} state={view.state} compact={compact} />
        </View>

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
            <Text style={styles.buttonText}>Resume samples</Text>
          </Pressable>
        </View>

        <View style={styles.facts}>
          <Text style={styles.text}>Device: {view.deviceId}</Text>
          <Text style={styles.text}>Connection: {view.connection}</Text>
          <Text style={styles.text}>Last usable update: {lastUsableUpdate}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
