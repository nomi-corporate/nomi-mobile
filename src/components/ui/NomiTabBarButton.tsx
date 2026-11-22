import { useEffect } from 'react';
import { Pressable, StyleSheet, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { palettes } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

type Props = {
  children?: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: ((event: GestureResponderEvent) => void) | null;
  accessibilityState?: { selected?: boolean };
  /** React Navigation 7 passes the focused state here instead of accessibilityState. */
  'aria-selected'?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  href?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Tab button for the bottom bar: the lilac pill fades and grows in when the tab becomes active,
 * the content lifts slightly, and a press gives a short scale feedback. Respects reduced motion.
 */
export function NomiTabBarButton({ children, onPress, onLongPress, accessibilityState, 'aria-selected': ariaSelected, accessibilityLabel, testID, style }: Props) {
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const selected = !!(ariaSelected ?? accessibilityState?.selected);
  const reducedMotion = useReducedMotion();
  const active = useSharedValue(selected ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    active.value = reducedMotion ? (selected ? 1 : 0) : withSpring(selected ? 1 : 0, { damping: 18, stiffness: 220 });
  }, [active, reducedMotion, selected]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ scaleX: interpolate(active.value, [0, 1], [0.6, 1]) }, { scaleY: interpolate(active.value, [0, 1], [0.8, 1]) }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(active.value, [0, 1], [0, -2]) },
      { scale: interpolate(pressed.value, [0, 1], [1, 0.92]) },
    ],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress ?? undefined}
      onPressIn={() => { pressed.value = reducedMotion ? 0 : withTiming(1, { duration: 90 }); }}
      onPressOut={() => { pressed.value = withTiming(0, { duration: 140 }); }}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[style, styles.button]}
    >
      <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: colors.tint }, pillStyle]} />
      <Animated.View style={[styles.content, contentStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', top: 6, bottom: 6, left: 6, right: 6, borderRadius: 12 },
  content: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
});
