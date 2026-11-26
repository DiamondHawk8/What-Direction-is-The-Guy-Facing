import { useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { ViewerEngine } from './core/viewer.ts';
import type { Clock, Snapshot } from './core/viewer.ts';
import type { HeadingFeed } from './sources/types.ts';
import { observeFeed } from './sources/observe.ts';


const clock = (): Clock => ({
  wallMs: Date.now(),
  monoMs: performance.now(),
});

// Connects a feed to the viewer engine
export function useViewer(feed: HeadingFeed | null, deviceId: string): Snapshot {
  const engine = useMemo(() => new ViewerEngine(deviceId), [feed, deviceId]);
  const [rendered, setRendered] = useState(() => ({
    engine,
    snapshot: engine.snapshot(clock()),
  }));

  useEffect(() => {
    if (!feed) return;
    let running = false;
    let stopObserving: (() => void) | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    // Refreshes snapshot
    const render = () => {
      setRendered({ engine, snapshot: engine.snapshot(clock()) });
    };

    const foreground = () => {
      if (running) {
        return;
      }

      running = true;
      stopObserving = observeFeed(feed, event => {
        engine.ingest(event, clock());
        render();
      });

      // Render even when no packets arrive
      interval = setInterval(render, 100);
    };

    // marks the viewer as suspended in the background
    const background = () => {
      running = false;
      stopObserving?.();
      stopObserving = null;

      if (interval) {
        clearInterval(interval);
      }

      interval = null;
      engine.ingest({
        type: 'connection',
        state: 'suspended',
        detail: 'Foreground operation only. Resume to wait for new readings.',
      }, clock());
      render();
    };

    const appIsActive = AppState.currentState === 'active';
    const webPageIsVisible =
      !appIsActive &&
      Platform.OS === 'web' &&
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible';

    if (appIsActive || webPageIsVisible) {
      foreground();
    } else {
      background();
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        foreground();
      } else {
        background();
      }
    });

    return () => {
      subscription.remove();
      stopObserving?.();

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [engine, feed]);

  // Source changes must not show the previous live state for one render
  return rendered.engine === engine ? rendered.snapshot : engine.snapshot(clock());
}
