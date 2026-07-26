import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, StatusBar, Pressable, Dimensions,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { useRouter } from 'expo-router';
import axios from 'axios';
import Animated, { 
  FadeInDown, FadeInUp, 
  useAnimatedStyle, useSharedValue, 
  withSpring, withTiming, withRepeat,
  interpolateColor, Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Mail, Bot, Smartphone, Stethoscope } from 'lucide-react-native';
import { BrandLogo } from '../components/brand-logo';
import { BlurView } from 'expo-blur';

const HOST = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const { width, height } = Dimensions.get('window');

// --- Custom Animated Button Component ---
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SpringButton({ onPress, disabled, loading, children }: any) {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(0.95); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={onPress}
      disabled={disabled}
      style={[style]}
    >
      <LinearGradient
        colors={loading ? ['rgba(210,34,103,0.4)', 'rgba(60,170,222,0.4)'] : ['#d22267', '#3caade']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingVertical: 14, borderRadius: 12,
          alignItems: 'center', justifyContent: 'center',
          flexDirection: 'row', gap: 8
        }}
      >
        {children}
      </LinearGradient>
    </AnimatedPressable>
  );
}

// --- Background Blobs ---
function BackgroundBlobs() {
  const blob1Y = useSharedValue(0);
  const blob2Y = useSharedValue(0);

  useEffect(() => {
    blob1Y.value = withRepeat(withTiming(-50, { duration: 4000 }), -1, true);
    blob2Y.value = withRepeat(withTiming(50, { duration: 5000 }), -1, true);
  }, []);

  const b1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: blob1Y.value }]
  }));

  const b2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: blob2Y.value }]
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[{
        position: 'absolute', top: height * 0.1, left: -width * 0.2,
        width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4,
        backgroundColor: 'rgba(210,34,103,0.15)',
        filter: [{ blur: 60 }]
      }, b1Style]} />
      <Animated.View style={[{
        position: 'absolute', top: height * 0.4, right: -width * 0.2,
        width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4,
        backgroundColor: 'rgba(60,170,222,0.15)',
        filter: [{ blur: 60 }]
      }, b2Style]} />
    </View>
  );
}

// --- Auto Scrolling Features ---
const FEATURE_ITEMS = [
  { Icon: Bot, color: '#7b2ff7', bg: 'rgba(123,47,247,0.15)', title: 'Yapay Zeka Destekli', desc: 'Google Gemini Altyapısı' },
  { Icon: Smartphone, color: '#3caade', bg: 'rgba(60,170,222,0.15)', title: '7/24 Asistan', desc: 'Her an yanınızdayız' },
  { Icon: Stethoscope, color: '#25d366', bg: 'rgba(37,211,102,0.15)', title: 'Klinik Odaklı', desc: 'Fizyoterapistlere özel' },
];

function AutoScrollingFeatures() {
  const transX = useSharedValue(0);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (contentWidth > 0) {
      transX.value = 0;
      transX.value = withRepeat(
        withTiming(-contentWidth, { duration: contentWidth * 20, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [contentWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: transX.value }],
    flexDirection: 'row',
    gap: 12,
  }));

  const renderItems = (isMeasureGroup = false) => (
    <View 
      style={{ flexDirection: 'row', gap: 12 }} 
      onLayout={(e) => {
        if (isMeasureGroup && contentWidth === 0) {
          setContentWidth(e.nativeEvent.layout.width + 12); 
        }
      }}
    >
      {FEATURE_ITEMS.map((item, idx) => (
        <View key={item.title + idx} style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
          borderRadius: 16, padding: 12, paddingRight: 16,
        }}>
          <View style={{
            width: 32, height: 32, borderRadius: 10,
            backgroundColor: item.bg,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <item.Icon size={16} color={item.color} />
          </View>
          <View>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>{item.title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{item.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={{ overflow: 'hidden', paddingHorizontal: 4 }}>
      <Animated.View style={animatedStyle}>
        {renderItems(true)}
        {renderItems()}
        {renderItems()}
      </Animated.View>
    </View>
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  // Focus animations (Border colors)
  const emailFocusAnim = useSharedValue(0);
  const passFocusAnim = useSharedValue(0);

  useEffect(() => {
    emailFocusAnim.value = withTiming(emailFocused ? 1 : 0, { duration: 200 });
  }, [emailFocused]);

  useEffect(() => {
    passFocusAnim.value = withTiming(passwordFocused ? 1 : 0, { duration: 200 });
  }, [passwordFocused]);

  const emailStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolateColor(
        emailFocusAnim.value,
        [0, 1],
        ['rgba(255,255,255,0.1)', 'rgba(60,170,222,0.7)']
      ),
      backgroundColor: interpolateColor(
        emailFocusAnim.value,
        [0, 1],
        ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)']
      )
    };
  });

  const passStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolateColor(
        passFocusAnim.value,
        [0, 1],
        ['rgba(255,255,255,0.1)', 'rgba(60,170,222,0.7)']
      ),
      backgroundColor: interpolateColor(
        passFocusAnim.value,
        [0, 1],
        ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)']
      )
    };
  });

  const handleLogin = async () => {
    if (!email || !password) {
      setError('E-posta/Telefon ve şifre zorunludur.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${HOST}/api/mobile/login`, { email, password });
      const { token, user } = response.data;
      await login(token, user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#07090f' }}>
      <StatusBar barStyle="light-content" backgroundColor="#07090f" />
      <BackgroundBlobs />
      
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header / Logo */}
            <Animated.View
              entering={FadeInDown.duration(600).delay(100).springify()}
              style={{ alignItems: 'center', marginBottom: 40 }}
            >
              <View style={{
                position: 'relative', width: 132, height: 132,
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <View style={{
                  position: 'absolute', width: 132, height: 132, borderRadius: 66,
                  backgroundColor: 'rgba(210,34,103,0.12)',
                }} />
                <LinearGradient
                  colors={['rgba(210,34,103,0.18)', 'rgba(60,170,222,0.16)', 'transparent']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ position: 'absolute', width: 116, height: 116, borderRadius: 58 }}
                />
                <BrandLogo size={104} />
              </View>

              <Text style={{ fontSize: 26, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5, marginBottom: 6 }}>
                MY FizyoAI
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
                Fizyoterapi Asistanınıza Hoş Geldiniz
              </Text>
            </Animated.View>

            {/* Login Card (Glassmorphism) */}
            <Animated.View entering={FadeInUp.duration(600).delay(200).springify()} style={{ borderRadius: 24, overflow: 'hidden' }}>
              <BlurView intensity={20} tint="dark" style={{
                padding: 24,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: 24,
                backgroundColor: 'rgba(255,255,255,0.02)'
              }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 6 }}>
                  Giriş Yap
                </Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
                  Hesabınıza erişmek için bilgilerinizi girin
                </Text>

                {/* Email input */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 8, marginLeft: 4 }}>
                    E-posta veya Telefon
                  </Text>
                  <Animated.View style={[{
                    flexDirection: 'row', alignItems: 'center',
                    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4,
                  }, emailStyle]}>
                    <Mail size={16} color={emailFocused ? "#3caade" : "rgba(255,255,255,0.3)"} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, color: '#fff', fontSize: 14, paddingVertical: 12 }}
                      placeholder="ornek@email.com"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                    />
                  </Animated.View>
                </View>

                {/* Password input */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 8, marginLeft: 4 }}>
                    Şifre
                  </Text>
                  <Animated.View style={[{
                    flexDirection: 'row', alignItems: 'center',
                    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4,
                  }, passStyle]}>
                    <Lock size={16} color={passwordFocused ? "#3caade" : "rgba(255,255,255,0.3)"} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, color: '#fff', fontSize: 14, paddingVertical: 12 }}
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoComplete="current-password"
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      onSubmitEditing={handleLogin}
                    />
                  </Animated.View>
                </View>

                {/* Error message */}
                {error ? (
                  <Animated.View entering={FadeInUp.duration(300)} style={{
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
                    borderRadius: 12, padding: 12, marginBottom: 20,
                  }}>
                    <Text style={{ color: '#f87171', fontSize: 13, textAlign: 'center' }}>{error}</Text>
                  </Animated.View>
                ) : null}

                {/* Submit button */}
                <SpringButton onPress={handleLogin} disabled={loading} loading={loading}>
                  {loading ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 }}>Giriş yapılıyor...</Text>
                    </>
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 }}>Giriş Yap</Text>
                  )}
                </SpringButton>

                <Text style={{
                  textAlign: 'center', fontSize: 11,
                  color: 'rgba(255,255,255,0.25)', marginTop: 20,
                }}>
                  Giriş bilgilerinizi kurumunuzdan veya sistem yöneticinizden alınız.
                </Text>
              </BlurView>
            </Animated.View>

            {/* Horizontal Features Teaser */}
            <Animated.View
              entering={FadeInUp.duration(600).delay(400).springify()}
              style={{ marginTop: 32 }}
            >
              <AutoScrollingFeatures />
            </Animated.View>

            {/* Footer */}
            <Text style={{
              textAlign: 'center', color: 'rgba(255,255,255,0.15)',
              fontSize: 10, marginTop: 40,
            }}>
              Copyright 2026 My FizyoPilates • Tüm Hakları Saklıdır
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
