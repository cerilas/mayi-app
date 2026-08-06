import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Linking, Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShieldAlert, Info, Lock, CalendarCheck } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const CONSENT_KEY = 'ai_medical_consent_v2';
const { width, height } = Dimensions.get('window');

export function AIConsentModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkConsent = async () => {
      try {
        const hasConsented = await AsyncStorage.getItem(CONSENT_KEY);
        if (hasConsented !== 'true') {
          setVisible(true);
        }
      } catch (error) {
        console.error('Error checking AI consent:', error);
      }
    };
    checkConsent();

    const subscription = DeviceEventEmitter.addListener('showMedicalDisclaimer', () => {
      setVisible(true);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(CONSENT_KEY, 'true');
      setVisible(false);
    } catch (error) {
      console.error('Error saving AI consent:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {}}
    >
      <BlurView intensity={Platform.OS === 'ios' ? 60 : 100} tint="dark" style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.iconBackground}
            >
              <ShieldAlert color="#fff" size={28} />
            </LinearGradient>
          </View>
          
          <Text style={styles.title}>Kullanım Koşulları & Tıbbi Uyarı</Text>
          <Text style={styles.subtitle}>MY FizioAI uygulamasını kullanmadan önce lütfen aşağıdaki koşulları okuyup onaylayın.</Text>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Tıbbi Sorumluluk Reddi */}
            <View style={styles.cardItem}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <ShieldAlert color="#ef4444" size={20} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Tıbbi Cihaz Değildir</Text>
                <Text style={styles.cardDesc}>
                  Bu uygulama tıbbi teşhis koyamaz veya tedavi öneremez. Profesyonel tıbbi tavsiye yerine geçmez. Karar vermeden önce daima hekiminize danışınız.
                </Text>
              </View>
            </View>

            {/* Uygulamanın Amacı */}
            <View style={styles.cardItem}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <CalendarCheck color="#3b82f6" size={20} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Genel Bilgilendirme ve Asistanlık</Text>
                <Text style={styles.cardDesc}>
                  Uygulama temel olarak randevu planlama, genel bilgilendirme, klinik hakkında soru-cevap ve asistanlık hizmetleri için tasarlanmıştır.
                </Text>
              </View>
            </View>

            {/* AI Veri İşleme */}
            <View style={styles.cardItem}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                <Info color="#a855f7" size={20} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Yapay Zeka (AI) Kullanımı</Text>
                <Text style={styles.cardDesc}>
                  Daha iyi hizmet sunabilmek için OpenAI ve Google Gemini gibi üçüncü taraf AI servisleri kullanılır.
                </Text>
              </View>
            </View>

            {/* Gizlilik */}
            <View style={styles.cardItem}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Lock color="#22c55e" size={20} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Gizlilik ve Anonimlik</Text>
                <Text style={styles.cardDesc}>
                  Kişisel kimlik bilgileriniz AI servislerine kesinlikle gönderilmez. Veriler analiz öncesi anonimleştirilir. Detaylar için{' '}
                  <Text style={styles.linkText} onPress={() => Linking.openURL('https://my.cerilas.com/privacy')}>
                    Gizlilik Politikamızı
                  </Text>{' '}
                  inceleyebilirsiniz.
                </Text>
              </View>
            </View>
            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.button} onPress={handleAccept} activeOpacity={0.8}>
              <LinearGradient
                colors={['#0a84ff', '#005bb5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Okudum ve Anladım</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    width: width * 0.9,
    maxHeight: height * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: -52,
    marginBottom: 16,
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#1c1c1e',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  scrollArea: {
    maxHeight: height * 0.5,
  },
  cardItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f3f4f6',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  linkText: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 16,
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0a84ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
