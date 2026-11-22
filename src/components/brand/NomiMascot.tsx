import { View, type ViewStyle } from 'react-native';
import Greeting from '../../assets/design-system/mascot-greeting.svg';
import Attentive from '../../assets/design-system/mascot-attentive.svg';
import Thinking from '../../assets/design-system/mascot-thinking.svg';
import Celebrating from '../../assets/design-system/mascot-celebrating.svg';
import Listening from '../../assets/design-system/mascot-listening.svg';
import Explaining from '../../assets/design-system/mascot-explaining.svg';
import Sleeping from '../../assets/design-system/mascot-sleeping.svg';
import Face from '../../assets/design-system/mascot-face.svg';

export type NomiMascotPose = 'greeting' | 'attentive' | 'thinking' | 'celebrating' | 'listening' | 'explaining' | 'sleeping' | 'face';

const poses = { greeting: Greeting, attentive: Attentive, thinking: Thinking, celebrating: Celebrating, listening: Listening, explaining: Explaining, sleeping: Sleeping, face: Face };

type Props = { pose?: NomiMascotPose; size?: number; accessibilityLabel?: string; style?: ViewStyle };

/** Static vector poses exported from the current Figma mascot-v2 component set. */
export function NomiMascot({ pose = 'greeting', size = 160, accessibilityLabel, style }: Props) {
  const Mascot = poses[pose];
  const label = accessibilityLabel ?? `Nomi ${pose === 'greeting' ? 'saudando' : pose}`;
  return <View accessible accessibilityRole="image" accessibilityLabel={label} style={style}><Mascot width={size} height={size} /></View>;
}

export function NomiMascotFace({ size = 40, accessibilityLabel = 'Nomi', style }: Omit<Props, 'pose'>) {
  return <NomiMascot pose="face" size={size} accessibilityLabel={accessibilityLabel} style={style} />;
}
