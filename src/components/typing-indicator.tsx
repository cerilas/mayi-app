import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface TypingIndicatorProps {
  color?: string;
  dotSize?: number;
}

export function TypingIndicator({ color = '#8E8E93', dotSize = 6 }: TypingIndicatorProps) {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const config = { duration: 400, easing: Easing.inOut(Easing.ease) };
    
    dot1.value = withRepeat(
      withSequence(withTiming(1, config), withTiming(0.3, config)),
      -1,
      true
    );
    
    dot2.value = withDelay(
      200,
      withRepeat(
        withSequence(withTiming(1, config), withTiming(0.3, config)),
        -1,
        true
      )
    );
    
    dot3.value = withDelay(
      400,
      withRepeat(
        withSequence(withTiming(1, config), withTiming(0.3, config)),
        -1,
        true
      )
    );
  }, []);

  const style1 = useAnimatedStyle(() => ({ opacity: dot1.value, transform: [{ scale: 0.8 + dot1.value * 0.2 }] }));
  const style2 = useAnimatedStyle(() => ({ opacity: dot2.value, transform: [{ scale: 0.8 + dot2.value * 0.2 }] }));
  const style3 = useAnimatedStyle(() => ({ opacity: dot3.value, transform: [{ scale: 0.8 + dot3.value * 0.2 }] }));

  const dotStyle = [
    styles.dot,
    { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color },
  ];

  return (
    <View style={styles.container}>
      <Animated.View style={[dotStyle, style1]} />
      <Animated.View style={[dotStyle, style2]} />
      <Animated.View style={[dotStyle, style3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 20,
    paddingHorizontal: 2,
  },
  dot: {
    // base styles
  },
});
