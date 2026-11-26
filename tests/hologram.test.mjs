import test from 'node:test';
import assert from 'node:assert/strict';
import { hologramSize, projectHologram } from '../src/ui/hologram/projection.ts';

test('projected material brightness stays bounded as the figure turns', () => {
  const model = {
    vertices: [[-0.15, 0, -0.5], [0, 0.4, -0.5], [0.15, 0, -0.5]],
    triangles: [[0, 1, 2]],
  };
  for (let heading = 0; heading < 360; heading += 15) {
    for (const face of projectHologram(model, heading)) {
      assert.ok(Number.isFinite(face.brightness));
      assert.ok(face.brightness >= 0 && face.brightness <= 1);
    }
  }
});

test('the same forward feature turns right for east and left for west', () => {
  const forwardFeature = {
    vertices: [
      [0, 0.4, -0.8],
      [-0.12, 0.4, -0.5],
      [0.12, 0.4, -0.5],
    ],
    triangles: [[0, 1, 2]],
  };

  const [eastFace] = projectHologram(forwardFeature, 90);
  const [westFace] = projectHologram(forwardFeature, 270);
  const centerX = hologramSize.width / 2;
  const screenXPositions = (face) => face.points.split(' ').map((point) => parseFloat(point));

  assert.ok(screenXPositions(eastFace).every((x) => x > centerX));
  assert.ok(screenXPositions(westFace).every((x) => x < centerX));
});

test('the front of the model faces the camera at south and is hidden at north', () => {
  const frontSurface = {
    vertices: [
      [-0.15, 0, -0.5],
      [0, 0.4, -0.5],
      [0.15, 0, -0.5],
    ],
    triangles: [[0, 1, 2]],
  };

  assert.equal(projectHologram(frontSurface, 180).length, 1);
  assert.equal(projectHologram(frontSurface, 0).length, 0);
});
