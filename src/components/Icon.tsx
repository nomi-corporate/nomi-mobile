import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useNomiTheme } from '@/theme/ThemeProvider';

export type IconName =
  | 'back'
  | 'bell'
  | 'home'
  | 'calendar'
  | 'group'
  | 'menu'
  | 'avatar'
  | 'chevronRight';

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 22, color }: IconProps) {
  const { colors } = useNomiTheme();
  const strokeColor = color ?? colors.accent;

  switch (name) {
    case 'back':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M19 12H5M11 6L5 12L11 18"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M18 16V11C18 7.68629 15.3137 5 12 5C8.68629 5 6 7.68629 6 11V16L4 18H20L18 16Z"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M10 21H14"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 10.5L12 3L21 10.5"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M5 9.5V20H19V9.5"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M10 20V14H14V20"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x={3}
            y={5}
            width={18}
            height={16}
            rx={2}
            stroke={strokeColor}
            strokeWidth={2}
          />
          <Line
            x1={3}
            y1={10}
            x2={21}
            y2={10}
            stroke={strokeColor}
            strokeWidth={2}
          />
          <Line
            x1={8}
            y1={3}
            x2={8}
            y2={7}
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Line
            x1={16}
            y1={3}
            x2={16}
            y2={7}
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'group':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={9} cy={8} r={3.5} stroke={strokeColor} strokeWidth={2} />
          <Path
            d="M3 20V18C3 15.2386 5.23858 13 8 13H10C12.7614 13 15 15.2386 15 18V20"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path
            d="M15.5 5.2C17.2 5.6 18.5 7.1 18.5 8.9C18.5 10.7 17.2 12.2 15.5 12.6"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path
            d="M18 13.5C20.2 14.1 21.5 15.9 21.5 18.2V20"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'menu':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line
            x1={4}
            y1={6}
            x2={20}
            y2={6}
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Line
            x1={4}
            y1={12}
            x2={20}
            y2={12}
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Line
            x1={4}
            y1={18}
            x2={20}
            y2={18}
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'avatar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={8} r={3.5} stroke={strokeColor} strokeWidth={2} />
          <Path
            d="M5 19.5C5 15.9101 7.91015 13 11.5 13H12.5C16.0899 13 19 15.9101 19 19.5"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'chevronRight':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M10 7L15 12L10 17"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
  }
}
