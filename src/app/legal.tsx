import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ShieldCheck, FileText, Info, AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function LegalScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#07090f' }} edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 border-b border-white/10">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-10 h-10 items-center justify-center bg-white/5 rounded-full"
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-white text-lg font-black mr-10">Hakkında & Yasal Metinler</Text>
      </View>

      <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        
        {/* Hakkımızda */}
        <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-indigo-100 rounded-xl items-center justify-center mr-3">
              <Info color="#4f46e5" size={20} />
            </View>
            <Text className="text-lg font-black text-gray-900">Hakkımızda</Text>
          </View>
          <Text className="text-gray-600 leading-6 font-medium">
            MYFizyo AI, yapay zeka destekli yenilikçi bir fizyoterapi asistanı ve takip uygulamasıdır. Amacımız, hastaların tedavi süreçlerini modern teknolojilerle desteklemek ve fizyoterapistlere güçlü bir klinik takip aracı sunmaktır.
          </Text>
        </View>

        {/* Tıbbi Feragatname */}
        <View className="bg-orange-50 rounded-3xl p-6 mb-6 shadow-sm border border-orange-100">
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-orange-200 rounded-xl items-center justify-center mr-3">
              <AlertTriangle color="#ea580c" size={20} />
            </View>
            <Text className="text-lg font-black text-orange-900">Tıbbi Feragatname</Text>
          </View>
          <Text className="text-orange-800 leading-6 font-bold mb-2">
            ÖNEMLİ UYARI: Bu uygulama doktor veya uzman fizyoterapist muayenesinin yerini tutmaz.
          </Text>
          <Text className="text-orange-700/80 leading-6 font-medium">
            Uygulama içerisindeki yapay zeka tarafından sunulan bilgiler, teşhis veya kesin tedavi amacı taşımaz. Herhangi bir sağlık sorununuz veya ağrınız olduğunda mutlaka öncelikle uzman bir hekime veya tedavinizi yürüten fizyoterapistinize danışmalısınız.
          </Text>
        </View>

        {/* Kullanım Koşulları */}
        <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-teal-100 rounded-xl items-center justify-center mr-3">
              <FileText color="#0d9488" size={20} />
            </View>
            <Text className="text-lg font-black text-gray-900">Kullanım Koşulları</Text>
          </View>
          <Text className="text-gray-600 leading-6 font-medium mb-4">
            • Uygulama içerisindeki hesap bilgilerinizin güvenliğinden siz sorumlusunuz.
          </Text>
          <Text className="text-gray-600 leading-6 font-medium mb-4">
            • Fizyoterapist tarafından atanan egzersizleri ve yapay zeka asistanının yönlendirmelerini uygularken fiziksel sınırlarınızı zorlamamalısınız.
          </Text>
          <Text className="text-gray-600 leading-6 font-medium">
            • Sistem üzerinde yapılan sohbetler ve veriler, hizmet kalitesini artırmak amacıyla işlenmekte ve güvenle saklanmaktadır.
          </Text>
        </View>

        {/* Gizlilik & KVKK */}
        <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-blue-100 rounded-xl items-center justify-center mr-3">
              <ShieldCheck color="#2563eb" size={20} />
            </View>
            <Text className="text-lg font-black text-gray-900">Gizlilik ve KVKK</Text>
          </View>
          <Text className="text-gray-600 leading-6 font-medium mb-4">
            Kişisel verileriniz 6698 sayılı Kişisel Verilerin Korunması Kanunu'na (KVKK) uygun olarak işlenmekte ve muhafaza edilmektedir.
          </Text>
          <Text className="text-gray-600 leading-6 font-medium mb-4">
            Sağlık verileriniz (yaş, cinsiyet, hastalık bilgileri ve klinik notlar) yalnızca tedavinizi yürüten fizyoterapistiniz ve size özel hizmet sunan yapay zeka asistanı tarafından kullanılmak üzere yüksek güvenlik standartlarıyla bulutta şifrelenerek saklanır.
          </Text>
          <Text className="text-gray-600 leading-6 font-medium">
            Uygulamayı kullanarak çerez ve gizlilik politikamızı kabul etmiş sayılırsınız. Verilerinizin silinmesi talebi için yöneticiniz ile iletişime geçebilirsiniz.
          </Text>
        </View>
        
        <View className="items-center mt-4 mb-8">
          <Text className="text-gray-400 font-bold text-xs">MYFizyo AI © {new Date().getFullYear()}</Text>
          <Text className="text-gray-400 font-medium text-xs mt-1">Tüm Hakları Saklıdır.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
