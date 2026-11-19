import { StyleSheet } from 'react-native';

const ink = '#202020';

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
    paddingTop: 36,
    paddingBottom: 36,
    gap: 36,
  },
  introduction: {
    gap: 12,
  },
  title: {
    color: ink,
    fontFamily: 'Georgia',
    fontSize: 32,
    lineHeight: 40,
  },
  text: {
    color: ink,
    fontSize: 16,
    lineHeight: 24,
  },
  reading: {
    gap: 8,
  },
  heading: {
    color: ink,
    fontFamily: 'Georgia',
    fontSize: 72,
    fontVariant: ['tabular-nums'],
  },
  facts: {
    marginTop: 24,
    gap: 4,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
