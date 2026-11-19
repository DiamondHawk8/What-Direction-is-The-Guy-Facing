import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('dist-ios/_expo/static/js/ios');
const maps = fs.readdirSync(root).filter(name => name.endsWith('.map'));
assert(maps.length > 0, 'Run npm run export:ios first.');
for (const name of maps) {
  const map = JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const sources = map.sources.map(s => s.replaceAll('\\', '/'));
  assert(!sources.some(s => /(^|\/)\.local\//.test(s)), 'Local reference files must not be bundled.');
  // This milestone intentionally has no network source. Restore the positive
  // MQTT ESM assertion with the adapter when real transport work resumes.
  assert(!sources.some(s => s.includes('/node_modules/mqtt/')), 'MQTT must not be bundled in the simulator milestone.');
  const forbidden = sources.filter(s => /\/mqtt\/build\/lib\/connect\/(tcp|tls)|\/node_modules\/ws\//.test(s));
  assert.deepEqual(forbidden, [], 'Node-only MQTT transports were included.');
  console.log('PASS: simulator-only bundle; no MQTT.js or Node MQTT transport modules.');
}
