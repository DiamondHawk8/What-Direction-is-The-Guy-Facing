type Model = {
  vertices: number[][];
  triangles: number[][];
};

type CameraPoint = {
  x: number;
  y: number;
  depth: number;
  screenX: number;
  screenY: number;
};

type ProjectedFace = {
  index: number;
  depth: number;
  points: string;
  color: string;
};

export const hologramSize = { width: 380, height: 332 };

const CAMERA_DISTANCE = 7;
const CAMERA_TILT = Math.PI / 14;
const CAMERA_TILT_SINE = Math.sin(CAMERA_TILT);
const CAMERA_TILT_COSINE = Math.cos(CAMERA_TILT);
const PIXELS_PER_UNIT = 117;
const MODEL_CENTER_Y = 157;

function projectVertex(
  vertex: number[],
  headingSine: number,
  headingCosine: number,
): CameraPoint {
  const [x, y, z] = vertex;

  // The camera looks north from the south
  const rotatedX = x * headingCosine - z * headingSine;
  const rotatedZ = x * headingSine + z * headingCosine;
  const cameraY = y * CAMERA_TILT_COSINE - rotatedZ * CAMERA_TILT_SINE;
  const depth = y * CAMERA_TILT_SINE + rotatedZ * CAMERA_TILT_COSINE;
  const perspective = CAMERA_DISTANCE / (CAMERA_DISTANCE - depth);

  return {
    x: rotatedX,
    y: cameraY,
    depth,
    screenX: hologramSize.width / 2 + rotatedX * PIXELS_PER_UNIT * perspective,
    screenY: MODEL_CENTER_Y - cameraY * PIXELS_PER_UNIT * perspective,
  };
}

function projectFace(
  first: CameraPoint,
  second: CameraPoint,
  third: CameraPoint,
  index: number,
): ProjectedFace | null {
  const firstEdgeX = second.x - first.x;
  const firstEdgeY = second.y - first.y;
  const firstEdgeDepth = second.depth - first.depth;
  const secondEdgeX = third.x - first.x;
  const secondEdgeY = third.y - first.y;
  const secondEdgeDepth = third.depth - first.depth;

  const normalX = firstEdgeY * secondEdgeDepth - firstEdgeDepth * secondEdgeY;
  const normalY = firstEdgeDepth * secondEdgeX - firstEdgeX * secondEdgeDepth;
  const normalDepth = firstEdgeX * secondEdgeY - firstEdgeY * secondEdgeX;

  const facingCamera =
    normalDepth * (CAMERA_DISTANCE - first.depth) - normalX * first.x - normalY * first.y;
  if (facingCamera <= 0) {
    return null;
  }

  const normalLength = Math.hypot(normalX, normalY, normalDepth);
  const lightFromAboveLeft = (-0.5 * normalX + 0.72 * normalY + 0.48 * normalDepth) / normalLength;
  const rimLight = 1 - Math.abs(normalDepth / normalLength);
  const brightness = Math.min(1, 0.18 + Math.max(0, lightFromAboveLeft) * 0.66 + rimLight * 0.19);
  const red = Math.round(16 + brightness * 141);
  const green = Math.round(79 + brightness * 170);
  const blue = Math.round(90 + brightness * 157);

  const points = [first, second, third]
    .map((point) => `${point.screenX.toFixed(2)},${point.screenY.toFixed(2)}`)
    .join(' ');

  return {
    index,
    depth: (first.depth + second.depth + third.depth) / 3,
    points,
    color: `rgb(${red}, ${green}, ${blue})`,
  };
}

export function projectHologram(model: Model, heading: number): ProjectedFace[] {
  const headingRadians = heading * Math.PI / 180;
  const headingSine = Math.sin(headingRadians);
  const headingCosine = Math.cos(headingRadians);
  const vertices = model.vertices.map((vertex) => projectVertex(vertex, headingSine, headingCosine));
  const visibleFaces: ProjectedFace[] = [];

  for (const [index, [first, second, third]] of model.triangles.entries()) {
    const face = projectFace(vertices[first], vertices[second], vertices[third], index);
    if (face) {
      visibleFaces.push(face);
    }
  }

  // Draw the far side first so  closer surfaces can cover it
  return visibleFaces.sort((first, second) => first.depth - second.depth);
}
