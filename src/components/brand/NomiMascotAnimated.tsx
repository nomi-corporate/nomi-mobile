import type { ViewStyle } from 'react-native';
import { NomiMascot, type NomiMascotPose } from './NomiMascot';

type Props = {
  pose?: Exclude<NomiMascotPose, 'face'>;
  size?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
  autoPlay?: boolean;
};

/** Static web and unsupported-platform fallback for the native Rive mascot. */
export function NomiMascotAnimated({ pose = 'greeting', ...props }: Props) {
  return <NomiMascot pose={pose} {...props} />;
}
