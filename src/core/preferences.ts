export type ThemeId = 'ink' | 'paper' | 'blue';
export type LayoutId = 'figure' | 'compass' | 'split';
export type Preferences = {
  theme: ThemeId;
  layout: LayoutId;
};

export const initialPreferences: Preferences = {
  theme: 'ink',
  layout: 'figure',
};

export type PreferenceAction =
  | { type: 'theme'; value: ThemeId }
  | { type: 'layout'; value: LayoutId }
  | { type: 'reset' };

export function preferencesReducer(state: Preferences, action: PreferenceAction): Preferences {
  switch (action.type) {
    case 'theme': return { ...state, theme: action.value };
    case 'layout': return { ...state, layout: action.value };
    case 'reset': return initialPreferences;
  }
}
