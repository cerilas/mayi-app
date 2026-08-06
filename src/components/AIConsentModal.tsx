import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_KEY = 'ai_data_consent_accepted';

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
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        // Must accept to close in order to use the app properly
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Yapay Zeka (AI) Kullanım İzni</Text>
          
          <ScrollView style={styles.scrollArea}>
            <Text style={styles.text}>
              MY FizioAI uygulaması, sizlere kişiselleştirilmiş analizler ve tedavi önerileri sunabilmek için OpenAI ve Google Gemini gibi üçüncü taraf yapay zeka (AI) servislerini kullanmaktadır.
            </Text>
            
            <Text style={styles.text}>
              <Text style={styles.bold}>Hangi Veriler Gönderiliyor?</Text>{'\n'}
              Sisteme girdiğiniz değerlendirme notları, postür analiz verileri ve hasta şikayetleri yapay zeka analizine gönderilebilir.
            </Text>
            
            <Text style={styles.text}>
              <Text style={styles.bold}>Gizlilik ve Anonimleştirme:</Text>{'\n'}
              Hastaların ad, soyad ve iletişim bilgileri (Kişisel Tanımlanabilir Bilgiler) gibi doğrudan kimlik açığa çıkaran veriler yapay zeka servislerine KESİNLİKLE gönderilmez. Veriler analiz öncesinde anonimleştirilir.
            </Text>
            
            <Text style={styles.text}>
              Uygulamayı kullanmaya devam ederek bu verilerin anonim bir şekilde AI servisleriyle paylaşılmasını onaylamış olursunuz. Daha fazla bilgi için uygulamanın ve sitemizin{' '}
              <Text 
                style={{ color: '#0a84ff', textDecorationLine: 'underline' }}
                onPress={() => Linking.openURL('https://my.cerilas.com/privacy')}
              >
                Gizlilik Politikasını
              </Text>{' '}
              inceleyebilirsiniz.
            </Text>
          </ScrollView>

          <TouchableOpacity style={styles.button} onPress={handleAccept}>
            <Text style={styles.buttonText}>Okudum ve Onaylıyorum</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1c1c1e', // Dark mode compatible
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollArea: {
    marginBottom: 20,
  },
  text: {
    fontSize: 15,
    color: '#d1d1d6',
    marginBottom: 12,
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  button: {
    backgroundColor: '#0a84ff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
