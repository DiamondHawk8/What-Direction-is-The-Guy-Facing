import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { ink } from './viewerStyles.ts';

const DIAL_CENTER = 128;
const ROTATION_ORIGIN = `${DIAL_CENTER},${DIAL_CENTER}`;
const tickAngles = Array.from({ length: 60 }, (_, tickIndex) => tickIndex * 6);

const cardinalPoints = [
  { letter: 'N', x: 128, y: 50 },
  { letter: 'E', x: 210, y: 134 },
  { letter: 'S', x: 128, y: 216 },
  { letter: 'W', x: 46, y: 134 },
];

export function Compass({ heading }: { heading: number | null }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 256 256">
      <Circle cx={DIAL_CENTER} cy={DIAL_CENTER} r={116} fill="none" stroke={ink} />

      {tickAngles.map((angle) => {
        const isMajorTick = angle % 30 === 0;

        return (
          <Line
            key={angle}
            x1={DIAL_CENTER}
            y1={12}
            x2={DIAL_CENTER}
            y2={isMajorTick ? 25 : 18}
            stroke={ink}
            strokeWidth={isMajorTick ? 1.5 : 0.75}
            origin={ROTATION_ORIGIN}
            rotation={angle}
          />
        );
      })}

      {cardinalPoints.map(({ letter, x, y }) => (
        <SvgText key={letter} x={x} y={y} textAnchor="middle" fill={ink} fontSize={17}>
          {letter}
        </SvgText>
      ))}

      {/* The unrotated needle points north. Headings turn it clockwise. */}
      {heading !== null && (
        <G origin={ROTATION_ORIGIN} rotation={heading}>
          <Polygon points="128,64 140,132 128,125 116,132" fill={ink} />
          <Polygon points="128,192 138,134 128,140 118,134" fill="none" stroke={ink} />
        </G>
      )}
      <Circle cx={DIAL_CENTER} cy={DIAL_CENTER} r={3} fill={ink} />
    </Svg>
  );
}
