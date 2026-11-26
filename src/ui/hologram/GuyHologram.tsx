import { memo, useId } from 'react';
import Svg, { Circle, Defs, Ellipse, Polygon, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import guyModel from '../../../assets/guy-model.json';
import { useAppearance } from '../AppearanceProvider.tsx';
import type { Palette } from '../theme.ts';
import { hologramSize, projectHologram } from './projection.ts';

const { width, height } = hologramSize;

function materialColor(brightness: number, figure: Palette['figure']): string {
  const channels = figure.shadow.map((shadow, index) =>
    Math.round(shadow + (figure.light[index] - shadow) * brightness),
  );
  return `rgb(${channels.join(', ')})`;
}

// The existing mesh now uses a matte material. No beams, scan lines, or motion
// independent of the measured heading: unavailable data always hides the figure.
export const GuyHologram = memo(function GuyHologram({ heading }: { heading: number | null }) {
  const { palette } = useAppearance();
  const { colors, figure } = palette;
  const sceneId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const shadowId = `shadow-${sceneId}`;
  const faces = heading === null ? [] : projectHologram(guyModel, heading);

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <RadialGradient id={shadowId}>
          <Stop offset="0" stopColor={colors.figureShadow} stopOpacity={0.18} />
          <Stop offset="1" stopColor={colors.figureShadow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {heading === null ? (
        <>
          <Circle cx={190} cy={153} r={40} fill="none" stroke={colors.border} />
          <SvgText x={190} y={162} textAnchor="middle" fontSize={28} fill={colors.secondary}>—</SvgText>
        </>
      ) : (
        <>
          <Ellipse cx={190} cy={280} rx={95} ry={22} fill={`url(#${shadowId})`} />
          {faces.map((face) => {
            const color = materialColor(face.brightness, figure);
            return (
              <Polygon
                key={face.index}
                points={face.points}
                fill={color}
                stroke={color}
                strokeWidth={0.28}
              />
            );
          })}
        </>
      )}
    </Svg>
  );
});
