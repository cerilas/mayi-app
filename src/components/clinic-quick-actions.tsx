import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { CalendarPlus, ChevronRight, Clock, FileText, MapPin, Phone, UserRound, Video } from 'lucide-react-native';
import type { ColorTokens } from '../lib/theme';
import type { QuickActionKey } from '../constants/clinic';

interface ClinicQuickActionsProps {
  colors: ColorTokens;
  busyKey: QuickActionKey | null;
  onSelect: (key: QuickActionKey) => void;
}

type CardAction = { key: QuickActionKey; title: string; subtitle: string; Icon: typeof MapPin };

const SECONDARY_ACTIONS: CardAction[] = [
  { key: 'location', title: 'Konum al', subtitle: 'Haritada aç', Icon: MapPin },
  { key: 'hours', title: 'Çalışma saatleri', subtitle: 'Pzt – Cmt', Icon: Clock },
  { key: 'about', title: 'Mahmut Yücel', subtitle: 'Kimdir?', Icon: UserRound },
];

const PERSONAL_ACTIONS: CardAction[] = [
  { key: 'therapist', title: 'Sorumlu terapistim', subtitle: 'Hemen arayın', Icon: Phone },
  { key: 'videos', title: 'Önerilen videolar', subtitle: 'Size özel', Icon: Video },
  { key: 'summary', title: 'Fizyoterapist özeti', subtitle: 'Sade dille', Icon: FileText },
];

const CHIP_ACTIONS: Array<{ key: QuickActionKey; label: string; Icon: typeof MapPin }> = [
  { key: 'appointment', label: 'Randevu al', Icon: CalendarPlus },
  { key: 'therapist', label: 'Terapistim', Icon: Phone },
  { key: 'videos', label: 'Videolarım', Icon: Video },
  { key: 'summary', label: 'Özetim', Icon: FileText },
  { key: 'location', label: 'Konum', Icon: MapPin },
  { key: 'hours', label: 'Çalışma saatleri', Icon: Clock },
  { key: 'about', label: 'Mahmut Yücel', Icon: UserRound },
];

export function ClinicQuickChips({ colors: C, busyKey, onSelect }: ClinicQuickActionsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
    >
      {CHIP_ACTIONS.map(({ key, label, Icon }) => {
        const primary = key === 'appointment';
        return (
          <TouchableOpacity
            key={key}
            disabled={busyKey !== null}
            onPress={() => onSelect(key)}
            activeOpacity={0.8}
            accessibilityRole="button"
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
              backgroundColor: primary ? C.brand : C.brandLight,
              borderWidth: 1, borderColor: primary ? C.brand : 'transparent',
            }}
          >
            {busyKey === key
              ? <ActivityIndicator size="small" color={primary ? '#ffffff' : C.brand} />
              : <Icon color={primary ? '#ffffff' : C.brand} size={14} strokeWidth={2.4} />}
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: primary ? '#ffffff' : C.brandDark }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function ClinicQuickActions({ colors: C, busyKey, onSelect }: ClinicQuickActionsProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
  }, [pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.55 }],
  }));

  const disabled = busyKey !== null;

  return (
    <View style={{ width: '100%', marginTop: 28 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: C.textTertiary, marginBottom: 10, marginLeft: 2 }}>
        HIZLI İŞLEMLER
      </Text>

      <Animated.View entering={FadeInDown.duration(450).springify().damping(16)}>
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={disabled}
          onPress={() => onSelect('appointment')}
          accessibilityRole="button"
          accessibilityLabel="Klinikten randevu al"
        >
          <LinearGradient
            colors={[C.brand, C.brandDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, paddingVertical: 18, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}
          >
            <View style={{ position: 'absolute', right: -30, top: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <View style={{ position: 'absolute', right: 40, bottom: -50, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.06)' }} />

            <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Animated.View style={[{ position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: '#ffffff' }, haloStyle]} />
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' }}>
                {busyKey === 'appointment'
                  ? <ActivityIndicator color="#ffffff" />
                  : <CalendarPlus color="#ffffff" size={24} strokeWidth={2.2} />}
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '800' }}>Randevu al</Text>
                <View style={{ marginLeft: 8, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' }}>
                  <Text style={{ color: '#ffffff', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6 }}>1 DAKİKA</Text>
                </View>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12.5, lineHeight: 17 }}>
                Gün ve saati seçin, talebiniz kliniğe hemen iletilsin.
              </Text>
            </View>

            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginLeft: 10 }}>
              <ChevronRight color="#ffffff" size={18} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <CardRow actions={SECONDARY_ACTIONS} colors={C} busyKey={busyKey} onSelect={onSelect} delayOffset={1} />

      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: C.textTertiary, marginTop: 20, marginBottom: 10, marginLeft: 2 }}>
        SİZE ÖZEL
      </Text>
      <CardRow actions={PERSONAL_ACTIONS} colors={C} busyKey={busyKey} onSelect={onSelect} delayOffset={4} />
    </View>
  );
}

function CardRow({ actions, colors: C, busyKey, onSelect, delayOffset }: ClinicQuickActionsProps & { actions: CardAction[]; delayOffset: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
      {actions.map(({ key, title, subtitle, Icon }, index) => (
        <Animated.View key={key} entering={FadeInDown.delay(90 * (index + delayOffset)).duration(420).springify().damping(16)} style={{ flex: 1 }}>
          <TouchableOpacity
            activeOpacity={0.75}
            disabled={busyKey !== null}
            onPress={() => onSelect(key)}
            accessibilityRole="button"
            accessibilityLabel={`${title} ${subtitle}`}
            style={{
              minHeight: 112,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.borderPrimary,
              backgroundColor: C.bgPrimary,
              padding: 12,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center' }}>
              {busyKey === key ? <ActivityIndicator size="small" color={C.brand} /> : <Icon color={C.brand} size={19} strokeWidth={2.2} />}
            </View>
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.textPrimary }} numberOfLines={2}>{title}</Text>
              <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
}
