import { View } from 'react-native';
import { NomiMascotAnimated } from '@/components/brand/NomiMascotAnimated';
import type { NomiMascotPose } from '@/components/brand/NomiMascot';
import { palettes } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

type Props = { pose: Exclude<NomiMascotPose, 'face'>; size?: number };

/** Animated Nomi mascot (Rive, static SVG fallback) centred on a circular tint halo (Figma 04: halo ≈ 86% of the mascot size). */
export function MascotHalo({ pose, size = 200 }: Props) {
  const { colorScheme } = useNomiTheme();
  const halo = Math.round(size * 0.86);
  // Light uses the Figma halo literal; dark uses the palette tint.
  const haloColor = colorScheme === 'dark' ? palettes.dark.tint : '#EBD8FA';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: halo, height: halo, borderRadius: halo / 2, backgroundColor: haloColor }} />
      <NomiMascotAnimated pose={pose} size={size} />
    </View>
  );
}
