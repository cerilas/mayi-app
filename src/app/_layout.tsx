import { useCallback, useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Text, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { BrandLogo } from '../components/brand-logo';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components/toast-config';
import { ThemeProvider } from '../context/ThemeContext';
import { AIConsentModal } from '../components/AIConsentModal';
import "../global.css";

SplashScreen.setOptions({ duration: 250, fade: true });
void SplashScreen.preventAutoHideAsync();

const { width: SW } = Dimensions.get('window');

export default function RootLayout() {
  const { isLoading, token, checkAuth } = useAuthStore();
  const { loadSettings } = useSettingsStore();
  const segments = useSegments();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  // Animation values
  const logoScale   = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale   = useSharedValue(0.6);
  const titleOpacity   = useSharedValue(0);
  const titleTranslateY = useSharedValue(12);
  const subtitleOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const hideSplash = useCallback(() => {
    screenOpacity.value = withTiming(
      0,
      { duration: 350, easing: Easing.out(Easing.ease) },
      (finished) => {
        if (finished) runOnJS(setShowSplash)(false);
      },
    );
  }, [screenOpacity]);

  useEffect(() => {
    checkAuth();
    loadSettings();
  }, []);

  useEffect(() => {
    SplashScreen.hide();

    glowOpacity.value = withTiming(1, { duration: 600 });
    glowScale.value   = withSpring(1, { damping: 12, stiffness: 80 });

    logoScale.value   = withDelay(100, withSpring(1, { damping: 10, stiffness: 120 }));
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));

    titleOpacity.value    = withDelay(400, withTiming(1, { duration: 400 }));
    titleTranslateY.value = withDelay(400, withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }));

    subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const subRoute = (segments as string[])[1];
    const isRestrictedTab =
      inAuthGroup &&
      subRoute &&
      subRoute !== 'index';

    if (!token && isRestrictedTab) {
      router.replace('/(tabs)');
    } else if (token && segments[0] === 'login') {
      router.replace('/(tabs)');
    }
  }, [token, isLoading, segments, router]);

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(hideSplash, 1600);

    return () => clearTimeout(timer);
  }, [isLoading, hideSplash]);

  // Animated styles
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <ThemeProvider>
    <>
      <StatusBar barStyle="light-content" backgroundColor="#07090f" />

      {/* App screens underneath */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login"  options={{ headerShown: false }} />
        <Stack.Screen name="posture" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>

      {showSplash && (
        <Animated.View
          style={[{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#07090f',
            alignItems: 'center', justifyContent: 'center',
          }, screenStyle]}
          pointerEvents="auto"
        >
          <Animated.View style={[{
            position: 'absolute',
            width: SW * 0.85, height: SW * 0.85, borderRadius: SW * 0.425,
          }, glowStyle]}>
            <LinearGradient
              colors={['rgba(210,34,103,0.18)', 'rgba(60,170,222,0.12)', 'transparent']}
              start={{ x: 0.2, y: 0.2 }}
              end={{ x: 0.8, y: 0.8 }}
              style={{ flex: 1, borderRadius: SW * 0.425 }}
            />
          </Animated.View>

          {[0.92, 0.76, 0.62].map((scale, index) => {
            const size = Math.min(SW * scale, 360);
            return (
              <Animated.View
                key={scale}
                style={[
                  {
                    position: 'absolute',
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: 1,
                    borderColor: index % 2 === 0
                      ? 'rgba(210,34,103,0.13)'
                      : 'rgba(60,170,222,0.13)',
                  },
                  glowStyle,
                ]}
              />
            );
          })}

          <Animated.View style={[{
            position: 'absolute',
            width: 246, height: 246, borderRadius: 123,
            borderWidth: 1,
            borderColor: 'rgba(210,34,103,0.24)',
          }, glowStyle]}>
            <LinearGradient
              colors={['rgba(210,34,103,0.16)', 'rgba(60,170,222,0.14)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, borderRadius: 123 }}
            />
          </Animated.View>

          <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, logoStyle]}>
            <BrandLogo size={176} />
          </Animated.View>

          <Animated.View style={[{ alignItems: 'center', marginTop: 18 }, titleStyle]}>
            <Text style={{
              fontSize: 28, fontWeight: '800', letterSpacing: -0.5,
              color: '#ffffff',
            }}>
              MY FizyoAI
            </Text>
          </Animated.View>

          <Animated.View style={[{ marginTop: 8 }, subtitleStyle]}>
            <Text style={{
              fontSize: 13, color: 'rgba(255,255,255,0.4)',
              letterSpacing: 0.2, textAlign: 'center',
            }}>
              Fizyoterapi Yapay Zeka Asistanı
            </Text>
          </Animated.View>

          <Animated.View style={[{
            position: 'absolute', bottom: 48,
            paddingHorizontal: 16, paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(255,255,255,0.04)',
          }, subtitleStyle]}>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.5 }}>
              Powered by Cerilas • cerilas.com
            </Text>
          </Animated.View>
        </Animated.View>
      )}
      <Toast config={toastConfig} topOffset={60} />
      <AIConsentModal />
    </>
    </ThemeProvider>
  );
}
