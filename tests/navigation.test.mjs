import test from 'node:test';
import assert from 'node:assert/strict';
import { tabs, tabAfterSwipe } from '../src/ui/navigation.ts';

test('the bottom bar contains only the main app pages', () => {
  assert.deepEqual(tabs.map(tab => tab.id), ['viewer', 'activity', 'settings']);
});

test('horizontal swipes switch pages and stop at each end', () => {
  assert.equal(tabAfterSwipe(0, -100, 5), 1);
  assert.equal(tabAfterSwipe(2, 100, 5), 1);
  assert.equal(tabAfterSwipe(0, 100, 0), 0);
  assert.equal(tabAfterSwipe(2, -100, 0), 2);
});

test('vertical scrolling and short gestures do not change pages', () => {
  assert.equal(tabAfterSwipe(1, -30, 0), 1);
  assert.equal(tabAfterSwipe(1, -80, 100), 1);
  assert.equal(tabAfterSwipe(1, 65, 50), 1);
});
