import { View } from 'react-native';
import AvatarPlaceholder from '../../assets/design-system/avatar-placeholder.svg';

/** Current Figma fallback avatar (64×64). */
export function NomiAvatarPlaceholder() {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Sem foto de perfil">
      <AvatarPlaceholder />
    </View>
  );
}
