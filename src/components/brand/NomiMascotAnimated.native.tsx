import { useEffect, useState, type ComponentType } from 'react';
import type { ViewStyle } from 'react-native';
import { NomiMascot, type NomiMascotPose } from './NomiMascot';

type MascotPose = Exclude<NomiMascotPose, 'face'>;
type Props = {
  pose?: MascotPose;
  size?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
  autoPlay?: boolean;
};
type RiveMascotComponent = ComponentType<Props>;

/**
 * Load Rive after the first native render. On some Android dev runtimes,
 * importing Nitro before Expo installs its JS global can crash the app before
 * the router mounts. The static mascot stays visible while Rive initializes.
 */
export function NomiMascotAnimated({ pose = 'greeting', size = 160, accessibilityLabel, style, autoPlay = true }: Props) {
  const [RiveMascot, setRiveMascot] = useState<RiveMascotComponent | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        const implementation = require('./NomiMascotRive.native').NomiMascotRive as RiveMascotComponent;
        setRiveMascot(() => implementation);
      } catch {
        // Keep the vector mascot visible if the optional native runtime is absent.
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, []);

  if (!RiveMascot) {
    return <NomiMascot pose={pose} size={size} accessibilityLabel={accessibilityLabel} style={style} />;
  }

  return <RiveMascot pose={pose} size={size} accessibilityLabel={accessibilityLabel} style={style} autoPlay={autoPlay} />;
}
