import type { FeedSink, HeadingFeed } from './types.ts';

export function observeFeed(feed: HeadingFeed, sink: FeedSink): () => void {
  let active = true;
  feed.start(event => { if (active) sink(event); });
  return () => {
    active = false;
    feed.stop();
  };
}
