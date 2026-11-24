import { memo, useId } from 'react';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import guyModel from '../../../assets/guy-model.json';
import { hologramSize, projectHologram } from './projection.ts';

const { width, height } = hologramSize;
const scanLines = Array.from({ length: 83 }, (_, index) => `M 0 ${index * 4} H ${width}`).join(' ');

export const GuyHologram = memo(function GuyHologram({ heading }: { heading: number | null }) {
  const sceneId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const backgroundId = `glow-${sceneId}`;
  const floorId = `floor-${sceneId}`;
  const beamId = `beam-${sceneId}`;
  const surfaceId = `surface-${sceneId}`;
  const faces = heading === null ? [] : projectHologram(guyModel, heading);
  const silhouette = faces.map((face) => `M ${face.points} Z`).join(' ');

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <RadialGradient id={backgroundId} cx="50%" cy="64%" rx="60%" ry="65%">
          <Stop offset="0" stopColor="#173e42" />
          <Stop offset="0.65" stopColor="#0c2327" />
          <Stop offset="1" stopColor="#07171a" />
        </RadialGradient>
        <RadialGradient id={floorId}>
          <Stop offset="0" stopColor="#58dccf" stopOpacity={0.52} />
          <Stop offset="1" stopColor="#58dccf" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={beamId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#78eee0" stopOpacity={0} />
          <Stop offset="1" stopColor="#78eee0" stopOpacity={0.16} />
        </LinearGradient>
        {faces.length > 0 && (
          <ClipPath id={surfaceId}>
            <Path d={silhouette} />
          </ClipPath>
        )}
      </Defs>

      <Rect width={width} height={height} fill={`url(#${backgroundId})`} />
      <G opacity={heading === null ? 0.35 : 1}>
        <Ellipse cx={190} cy={278} rx={120} ry={40} fill={`url(#${floorId})`} />
        <Ellipse cx={190} cy={278} rx={94} ry={25} fill="none" stroke="#77d6cb" strokeOpacity={0.38} />
        <Ellipse cx={190} cy={278} rx={70} ry={18} fill="none" stroke="#9becdf" strokeOpacity={0.46} />
      </G>

      {faces.length > 0 && (
        <>
          <Path d="M 123 278 L 150 42 H 230 L 257 278 Z" fill={`url(#${beamId})`} />
          <G opacity={0.94}>
            {faces.map((face) => (
              <Polygon
                key={face.index}
                points={face.points}
                fill={face.color}
                stroke={face.color}
                strokeWidth={0.28}
              />
            ))}
          </G>
          <Path
            d={scanLines}
            clipPath={`url(#${surfaceId})`}
            stroke="#b0fff2"
            strokeOpacity={0.26}
            strokeWidth={0.55}
          />
        </>
      )}
    </Svg>
  );
});
