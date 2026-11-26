import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPreferences, preferencesReducer } from '../src/core/preferences.ts';

test('theme and layout selections are independent', () => {
  let state = preferencesReducer(initialPreferences, { type: 'theme', value: 'blue' });
  state = preferencesReducer(state, { type: 'layout', value: 'compass' });
  assert.deepEqual(state, { theme: 'blue', layout: 'compass' });
  assert.deepEqual(initialPreferences, { theme: 'ink', layout: 'figure' });
});

test('reset restores the default orange and black figure layout', () => {
  const state = preferencesReducer({ theme: 'paper', layout: 'split' }, { type: 'reset' });
  assert.deepEqual(state, initialPreferences);
});
