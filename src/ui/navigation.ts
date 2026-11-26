import type { IconName } from './Icon.tsx';

export const tabs: { id: IconName; label: string }[] = [
  { id: 'viewer', label: 'Viewer' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings' },
];

export function tabAfterSwipe(current: number, dx: number, dy: number): number {
  if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy) * 1.8) return current;
  return Math.max(0, Math.min(tabs.length - 1, current + (dx < 0 ? 1 : -1)));
}
