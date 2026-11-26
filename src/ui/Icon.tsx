import Svg, { Circle, Path } from 'react-native-svg';

export type IconName = 'viewer' | 'activity' | 'settings';
const paths: Record<IconName, string> = {
  viewer: 'M12 3 21 21 12 16 3 21 12 3Z',
  activity: 'M4 19V13 M12 19V5 M20 19V9',
  settings: 'M4 6H20 M4 12H20 M4 18H20',
};

export function Icon({ name, color, size = 22 }: { name: IconName; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path d={paths[name]} stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {name === 'settings' && <>
        <Circle cx={8} cy={6} r={2} fill={color} />
        <Circle cx={16} cy={12} r={2} fill={color} />
        <Circle cx={10} cy={18} r={2} fill={color} />
      </>}
    </Svg>
  );
}
