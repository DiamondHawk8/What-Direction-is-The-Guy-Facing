import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { useAppearance } from './AppearanceProvider.tsx';

const DIAL_CENTER = 128;
const tickAngles = Array.from({ length: 60 }, (_, tickIndex) => tickIndex * 6);

const cardinalPoints = [
  { letter: 'N', x: 128, y: 50 },
  { letter: 'E', x: 210, y: 134 },
  { letter: 'S', x: 128, y: 216 },
  { letter: 'W', x: 46, y: 134 },
];

function rotateAroundDial(angle: number): string {
  return `rotate(${angle} ${DIAL_CENTER} ${DIAL_CENTER})`;
}

export function Compass({ heading }: { heading: number | null }) {
  const { palette, formatText } = useAppearance();
  const { colors } = palette;
  const ink = colors.accent;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 256 256">
      <Circle cx={DIAL_CENTER} cy={DIAL_CENTER} r={116} fill="none" stroke={colors.border} />

      {tickAngles.map((angle) => {
        const isMajorTick = angle % 30 === 0;

        return (
          <Line
            key={angle}
            x1={DIAL_CENTER}
            y1={12}
            x2={DIAL_CENTER}
            y2={isMajorTick ? 25 : 18}
            stroke={isMajorTick ? colors.secondary : colors.border}
            strokeWidth={isMajorTick ? 1.5 : 0.75}
            transform={rotateAroundDial(angle)}
          />
        );
      })}

      {cardinalPoints.map(({ letter, x, y }) => (
        <SvgText key={letter} x={x} y={y} textAnchor="middle" fill={ink} fontSize={17}>
          {formatText(letter)}
        </SvgText>
      ))}

      {/* The unrotated needle points north. Headings turn it clockwise. */}
      {heading !== null && (
        <G transform={rotateAroundDial(heading)}>
          <Polygon points="128,64 140,132 128,125 116,132" fill={ink} />
          <Polygon points="128,192 138,134 128,140 118,134" fill="none" stroke={ink} />
        </G>
      )}
      <Circle cx={DIAL_CENTER} cy={DIAL_CENTER} r={3} fill={ink} />
    </Svg>
  );
}
