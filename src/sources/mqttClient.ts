import mqtt from 'mqtt';
import type { MqttClientFactory } from './mqtt.ts';

// Metro resolves mqtt's react-native/browser export to dist/mqtt.esm.js.
// Runtime imports are currently separate so transport behavior can be tested offline TODO
export const createMqttClient: MqttClientFactory = (url, options) => mqtt.connect(url, options);
