import type { Telemetry } from './contract.ts';
import type { FeedKind } from '../sources/types.ts';
import type { Activity } from './activity.ts';

export type SourceDescription = {
  badge: string;
  label: string;
  readings: string;
  simulated: boolean;
};

export function describeSource(kind: FeedKind, reportedSource?: Telemetry['source']): SourceDescription {
  if (kind === 'simulation') {
    return { badge: 'SIMULATOR', label: 'Local simulator', readings: 'Simulated readings', simulated: true };
  }
  if (reportedSource === 'simulator') {
    return { badge: 'MQTT · SIM', label: 'Simulator over MQTT', readings: 'Simulated readings over MQTT', simulated: true };
  }
  const label = reportedSource === 'ble_gateway' ? 'BLE gateway over MQTT'
    : reportedSource === 'usb_gateway' ? 'USB gateway over MQTT' : 'MQTT source';
  return { badge: 'MQTT', label, readings: 'MQTT readings', simulated: false };
}

export function activitySourceLabel(activity: Activity, kind: FeedKind): string {
  const simulated = activity.sources.simulator;
  const measured = activity.sources.usb_gateway + activity.sources.ble_gateway;
  if (simulated > 0 && measured > 0) return 'Mixed simulated and device readings';
  if (simulated > 0 || kind === 'simulation') return 'Simulated readings';
  if (measured > 0) return 'Device readings over MQTT';
  return 'Waiting for MQTT readings';
}
