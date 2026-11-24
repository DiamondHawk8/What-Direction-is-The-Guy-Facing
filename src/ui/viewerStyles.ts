import { StyleSheet } from 'react-native';

export const ink = '#202020';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf9f6',
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    gap: 24,
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
  reading: {
    alignItems: 'center',
    gap: 4,
  },
  compass: {
    width: '100%',
    maxWidth: 252,
    aspectRatio: 1,
  },
  heading: {
    color: ink,
    fontFamily: 'Georgia',
    fontSize: 64,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
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
