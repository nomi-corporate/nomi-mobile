import { useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Fit, RiveView, useRiveFile } from '@rive-app/react-native';
import { NomiMascot, type NomiMascotPose } from './NomiMascot';

type MascotPose = Exclude<NomiMascotPose, 'face'>;
type Props = {
  pose: MascotPose;
  size: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
  autoPlay: boolean;
};

const poseArtboards: Record<MascotPose, { artboard: string; stateMachine: string }> = {
  greeting: { artboard: 'Saudando', stateMachine: 'Saudando Loop' },
  attentive: { artboard: 'Atento', stateMachine: 'Atento Loop' },
  thinking: { artboard: 'Pensando', stateMachine: 'Pensando Loop' },
  celebrating: { artboard: 'Comemorando', stateMachine: 'Comemorando Loop' },
  listening: { artboard: 'Ouvindo', stateMachine: 'Ouvindo Loop' },
  explaining: { artboard: 'Explicando', stateMachine: 'Explicando Loop' },
  sleeping: { artboard: 'Dormindo', stateMachine: 'Dormindo Loop' },
};

const mascotFile = require('../../assets/rive/nomi_mascots.riv');

/** Rive-powered Figma mascot, loaded lazily by NomiMascotAnimated. */
export function NomiMascotRive({ pose, size, accessibilityLabel, style, autoPlay }: Props) {
  const [renderError, setRenderError] = useState(false);
  const { riveFile, error } = useRiveFile(mascotFile);
  const label = accessibilityLabel ?? `Nomi ${pose === 'greeting' ? 'saudando' : pose}`;

  if (!riveFile || error || renderError) {
    return <NomiMascot pose={pose} size={size} accessibilityLabel={label} style={style} />;
  }

  const selected = poseArtboards[pose];
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={[styles.container, { width: size, height: size }, style]}>
      <RiveView
        file={riveFile}
        artboardName={selected.artboard}
        stateMachineName={selected.stateMachine}
        autoPlay={autoPlay}
        fit={Fit.Contain}
        onError={() => setRenderError(true)}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { overflow: 'hidden' } });
