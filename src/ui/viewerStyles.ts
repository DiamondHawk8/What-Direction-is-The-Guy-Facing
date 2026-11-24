import { StyleSheet } from 'react-native';
import { hologramSize } from './hologram/projection.ts';

export const ink = '#202020';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf9f6',
  },
  content: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 20,
  },
  introduction: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: ink,
    fontFamily: 'Georgia',
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
  },
  text: {
    color: ink,
    fontSize: 16,
    lineHeight: 24,
  },
  instrument: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 28,
    rowGap: 12,
  },
  hologram: {
    width: '100%',
    maxWidth: 424,
    aspectRatio: hologramSize.width / hologramSize.height,
    backgroundColor: '#07171a',
  },
  reading: {
    width: 230,
    maxWidth: '100%',
    alignItems: 'center',
    gap: 4,
  },
  compactReading: {
    width: '100%',
    maxWidth: 424,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  compass: {
    width: '100%',
    maxWidth: 220,
    aspectRatio: 1,
  },
  compactCompass: {
    width: 112,
    maxWidth: '40%',
  },
  headingDetails: {
    alignItems: 'center',
    flexShrink: 1,
    gap: 4,
  },
  heading: {
    color: ink,
    fontFamily: 'Georgia',
    fontSize: 64,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  compactHeading: {
    fontSize: 44,
  },
  readingText: {
    color: ink,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  facts: {
    alignItems: 'center',
    gap: 4,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    backgroundColor: ink,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.65,
  },
});
