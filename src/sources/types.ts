export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'suspended';
export type FeedEvent =
  | { type: 'connection'; state: ConnectionState; detail?: string }
  | { type: 'packet'; topic: string; payload: string; retained: boolean };
export type FeedSink = (event: FeedEvent) => void;
export type FeedKind = 'simulation' | 'mqtt';


export interface HeadingFeed {
  readonly kind: FeedKind;
  start(sink: FeedSink): void;
  stop(): void;
}

