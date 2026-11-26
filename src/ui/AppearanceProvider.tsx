import { createContext, useContext, useMemo, useReducer } from 'react';
import type { Dispatch, PropsWithChildren } from 'react';
import { initialPreferences, preferencesReducer } from '../core/preferences.ts';
import type { PreferenceAction, Preferences } from '../core/preferences.ts';
import { palettes } from './theme.ts';
import type { Palette } from './theme.ts';

type Appearance = {
  preferences: Preferences;
  dispatch: Dispatch<PreferenceAction>;
  palette: Palette;
  formatText: (text: string) => string;
};

const AppearanceContext = createContext<Appearance | null>(null);
const unchangedText = (text: string) => text;

export function AppearanceProvider({ children }: PropsWithChildren) {
  const [preferences, dispatch] = useReducer(preferencesReducer, initialPreferences);
  const palette = palettes[preferences.theme];
  const value = useMemo(
    () => ({ preferences, dispatch, palette, formatText: unchangedText }),
    [preferences, palette],
  );
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

// A themed subtree can override presentation so that it can be rendered in a different theme 
export function AppearanceOverride({ children, ...overrides }: PropsWithChildren<
  Partial<Pick<Appearance, 'palette' | 'formatText' | 'dispatch'>>
>) {
  const appearance = useAppearance();
  return (
    <AppearanceContext.Provider value={{ ...appearance, ...overrides }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): Appearance {
  const appearance = useContext(AppearanceContext);
  if (!appearance) throw new Error('AppearanceProvider is required.');
  return appearance;
}
