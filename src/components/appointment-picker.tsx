import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import axios from 'axios';
import { CalendarDays, CheckCircle2, Clock } from 'lucide-react-native';
import { WhatsAppIcon } from './whatsapp-icon';
import type { ColorTokens } from '../lib/theme';

const CLINIC_WHATSAPP_PHONE = '905406502727';

async function openAppointmentWhatsApp() {
  const text = encodeURIComponent('Merhaba, MY FizioAI uygulaması üzerinden kliniğinizden randevu almak istiyorum.');
  const whatsappUrl = `whatsapp://send?phone=${CLINIC_WHATSAPP_PHONE}&text=${text}`;
  const webUrl = `https://wa.me/${CLINIC_WHATSAPP_PHONE}?text=${text}`;
  try {
    const supported = await Linking.canOpenURL(whatsappUrl);
    await Linking.openURL(supported ? whatsappUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

interface SlotInfo { time: string; available: boolean }
interface DayAvailability { date: string; weekday: string; label: string; slots: SlotInfo[] }

interface AppointmentPickerProps<TMessage> {
  apiUrl: string;
  authorization: string;
  colors: ColorTokens;
  conversationId: string | null;
  onBooked: (messages: TMessage[]) => void;
}

const SHORT_WEEKDAY: Record<string, string> = {
  Pazartesi: 'Pzt', Salı: 'Sal', Çarşamba: 'Çar', Perşembe: 'Per', Cuma: 'Cum', Cumartesi: 'Cmt', Pazar: 'Paz',
};

export function AppointmentPicker<TMessage>({ apiUrl, authorization, colors: C, conversationId, onBooked }: AppointmentPickerProps<TMessage>) {
  const [days, setDays] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookedLabel, setBookedLabel] = useState<string | null>(null);

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/appointments/availability`, { headers: { Authorization: authorization } });
      const nextDays: DayAvailability[] = res.data?.days ?? [];
      setDays(nextDays);
      setSelectedDate(current => (current && nextDays.some(d => d.date === current) ? current : nextDays[0]?.date ?? null));
    } catch {
      setError('Uygun gün ve saatler alınamadı. Randevu için 0540 650 27 27 numaralı WhatsApp hattımızdan bize ulaşabilirsiniz.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, authorization]);

  useEffect(() => { void loadAvailability(); }, [loadAvailability]);

  const selectedDay = useMemo(() => days.find(d => d.date === selectedDate) ?? null, [days, selectedDate]);

  const submit = async () => {
    if (!selectedDay || !selectedTime || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await axios.post(
        `${apiUrl}/appointments`,
        { date: selectedDay.date, time: selectedTime, conversationId },
        { headers: { Authorization: authorization } },
      );
      setBookedLabel(res.data?.label ?? `${selectedDay.label}, ${selectedTime}`);
      onBooked(res.data?.messages ?? []);
    } catch (e) {
      const message = axios.isAxiosError(e) ? e.response?.data?.error : null;
      setError(message || 'Randevu talebi gönderilemedi. Lütfen tekrar deneyin.');
      setSelectedTime(null);
      void loadAvailability();
    } finally {
      setSubmitting(false);
    }
  };

  if (bookedLabel) {
    return (
      <View style={{ marginTop: 10, borderRadius: 16, padding: 14, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <CheckCircle2 color="#059669" size={22} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#065f46' }}>Talebiniz kliniğe iletildi</Text>
          <Text style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>{bookedLabel}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 10, borderRadius: 18, borderWidth: 1, borderColor: C.borderPrimary, backgroundColor: C.bgPrimary, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 }}>
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center' }}>
          <CalendarDays color={C.brand} size={16} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.textPrimary }}>Gün seçin</Text>
      </View>

      {loading && days.length === 0 ? (
        <View style={{ paddingVertical: 28, alignItems: 'center' }}>
          <ActivityIndicator color={C.brand} />
        </View>
      ) : days.length === 0 ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Text style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 18, marginBottom: 10 }}>
            {error || 'Önümüzdeki günlerde uygun saat bulunamadı. Randevu için doğrudan 0540 650 27 27 numaralı WhatsApp hattımızdan bize ulaşabilirsiniz.'}
          </Text>
          <TouchableOpacity
            onPress={() => void openAppointmentWhatsApp()}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: '#16a34a',
              borderRadius: 12,
              paddingVertical: 11,
              paddingHorizontal: 14,
            }}
          >
            <WhatsAppIcon size={16} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>
              WhatsApp'tan Randevu Al (0540 650 27 27)
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
            {days.map(day => {
              const [dayNum, month] = day.label.split(' ');
              const active = day.date === selectedDate;
              return (
                <TouchableOpacity
                  key={day.date}
                  onPress={() => { setSelectedDate(day.date); setSelectedTime(null); setError(''); }}
                  activeOpacity={0.8}
                  style={{
                    width: 58, paddingVertical: 9, borderRadius: 14, alignItems: 'center',
                    backgroundColor: active ? C.brand : C.bgSecondary,
                    borderWidth: 1, borderColor: active ? C.brand : C.borderPrimary,
                  }}
                  accessibilityLabel={day.label}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '600', color: active ? 'rgba(255,255,255,0.85)' : C.textTertiary }}>{SHORT_WEEKDAY[day.weekday] ?? day.weekday}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: active ? '#ffffff' : C.textPrimary, marginVertical: 1 }}>{dayNum}</Text>
                  <Text style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.85)' : C.textTertiary }}>{month?.slice(0, 3)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedDay && (
            <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Clock color={C.textTertiary} size={13} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.textSecondary }}>{selectedDay.label}</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {selectedDay.slots.map(slot => {
                  const active = slot.time === selectedTime;
                  return (
                    <TouchableOpacity
                      key={slot.time}
                      disabled={!slot.available}
                      onPress={() => { setSelectedTime(slot.time); setError(''); }}
                      activeOpacity={0.8}
                      style={{
                        width: '22.5%', paddingVertical: 9, borderRadius: 11, alignItems: 'center',
                        backgroundColor: active ? C.brand : slot.available ? C.brandLight : C.bgSecondary,
                        borderWidth: 1, borderColor: active ? C.brand : slot.available ? 'transparent' : C.borderPrimary,
                        opacity: slot.available ? 1 : 0.55,
                      }}
                      accessibilityLabel={`${slot.time}${slot.available ? '' : ' dolu'}`}
                    >
                      <Text style={{
                        fontSize: 13, fontWeight: '700',
                        color: active ? '#ffffff' : slot.available ? C.brandDark : C.textTertiary,
                        textDecorationLine: slot.available ? 'none' : 'line-through',
                      }}>
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {error !== '' && (
            <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
              <Text style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>
                {error} Dilerseniz 0540 650 27 27 numaralı WhatsApp hattımızdan da bize ulaşabilirsiniz.
              </Text>
              <TouchableOpacity
                onPress={() => void openAppointmentWhatsApp()}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: '#16a34a',
                  borderRadius: 10,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                }}
              >
                <WhatsAppIcon size={15} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '700' }}>
                  WhatsApp'tan Ulaşın (0540 650 27 27)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ padding: 14 }}>
            <TouchableOpacity
              onPress={() => void submit()}
              disabled={!selectedTime || submitting}
              activeOpacity={0.85}
              style={{
                borderRadius: 13, paddingVertical: 13, alignItems: 'center',
                backgroundColor: selectedTime ? C.brand : C.bgSecondary,
                borderWidth: 1, borderColor: selectedTime ? C.brand : C.borderPrimary,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: selectedTime ? '#ffffff' : C.textTertiary }}>
                  {selectedTime && selectedDay ? `${selectedDay.label}, ${selectedTime} için talep gönder` : 'Saat seçin'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
