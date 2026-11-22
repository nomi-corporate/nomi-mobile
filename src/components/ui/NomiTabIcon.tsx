import Svg, { Circle, Path } from 'react-native-svg';
import type { ColorValue } from 'react-native';

export type NomiTabIconName = 'home' | 'calendar' | 'group' | 'menu' | 'book' | 'profile' | 'note' | 'back';

type Props = {
  name: NomiTabIconName;
  color: ColorValue;
};

export function NomiTabIcon({ name, color }: Props) {
  const strokeWidth = 1.5;
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none" accessibilityElementsHidden>
      {name === 'home' ? (
        <Path
          d="M2.75 8.7 10 2.9l7.25 5.8v7.05a1.5 1.5 0 0 1-1.5 1.5h-3.5v-5.1h-4.5v5.1h-3.5a1.5 1.5 0 0 1-1.5-1.5V8.7Z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {name === 'calendar' ? (
        <Path
          d="M4 4.2h12a1.5 1.5 0 0 1 1.5 1.5v10.1a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V5.7A1.5 1.5 0 0 1 4 4.2Zm-.8 4h13.6M6.5 2.8v2.8m7-2.8v2.8"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {name === 'group' ? (
        <>
          <Circle cx={7.2} cy={7} r={2.8} stroke={color} strokeWidth={strokeWidth} />
          <Path d="M2.7 16a4.5 4.5 0 0 1 9 0M13.3 4.7a2.8 2.8 0 0 1 0 5.4m1.1 2.1a4.5 4.5 0 0 1 3 3.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      ) : null}
      {name === 'menu' ? (
        <Path d="M3 5.2h14M3 10h14M3 14.8h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      ) : null}
      {name === 'book' ? (
        <Path
          d="M3 4.4h9.2a2.8 2.8 0 0 1 2.8 2.8v9.1H5.8A2.8 2.8 0 0 1 3 13.5V4.4Zm0 9.1a2.8 2.8 0 0 1 2.8-2.8H15M7 7.2h4.4"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {name === 'profile' ? (
        <>
          <Circle cx={10} cy={6.6} r={3.1} stroke={color} strokeWidth={strokeWidth} />
          <Path
            d="M3.4 17a6.6 6.6 0 0 1 13.2 0"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </>
      ) : null}
      {name === 'note' ? (
        <Path d="M5 2.8h7l4 4v10.4a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 17.2V4.3a1.5 1.5 0 0 1 1-1.5Zm6.5.3v4.5H16M7 11h6m-6 3h6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {name === 'back' ? (
        <Path d="m12.5 3.5-6.5 6.5 6.5 6.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
    </Svg>
  );
}
