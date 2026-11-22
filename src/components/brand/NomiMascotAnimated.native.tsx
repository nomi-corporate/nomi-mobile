import { memo, useEffect, useState, type ComponentType } from 'react';
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
type RiveMascotComponent = ComponentType<Required<Pick<Props, 'pose' | 'size' | 'autoPlay'>> & Pick<Props, 'accessibilityLabel' | 'style'>>;

// Loaded once per app run: after the first screen, every mascot mounts already animated.
let riveImplementation: RiveMascotComponent | null = null;
let riveUnavailable = false;

function loadRive(): RiveMascotComponent | null {
  if (riveImplementation || riveUnavailable) return riveImplementation;
  try {
    riveImplementation = require('./NomiMascotRive.native').NomiMascotRive as RiveMascotComponent;
  } catch {
    // Keep the vector mascot when the optional native runtime is absent.
    riveUnavailable = true;
  }
  return riveImplementation;
}

/**
 * Animated Figma mascot (Rive) with the static SVG pose as fallback.
 * Rive is loaded after the first native render of the app: on some Android dev runtimes,
 * importing Nitro before Expo installs its JS global crashes before the router mounts.
 * Memoized so frequent parent re-renders (timers, voice meter) never touch the native view.
 */
export const NomiMascotAnimated = memo(function NomiMascotAnimated({ pose = 'greeting', size = 160, accessibilityLabel, style, autoPlay = true }: Props) {
  const [RiveMascot, setRiveMascot] = useState<RiveMascotComponent | null>(() => riveImplementation);

  useEffect(() => {
    if (RiveMascot || riveUnavailable) return;
    const timeout = setTimeout(() => {
      const implementation = loadRive();
      if (implementation) setRiveMascot(() => implementation);
    }, 800);
    return () => clearTimeout(timeout);
  }, [RiveMascot]);

  if (!RiveMascot) {
    return <NomiMascot pose={pose} size={size} accessibilityLabel={accessibilityLabel} style={style} />;
  }
  return <RiveMascot pose={pose} size={size} accessibilityLabel={accessibilityLabel} style={style} autoPlay={autoPlay} />;
});
