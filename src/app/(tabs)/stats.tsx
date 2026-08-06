import Toast from 'react-native-toast-message';
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart2, Users, MessageSquare, AlertCircle, Mail, Smartphone, RefreshCw } from 'lucide-react-native';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { BrandLogo } from '../../components/brand-logo';
import { AppHeader } from '../../components/app-header';
import { Skeleton } from '../../components/skeleton';

const API_URL = 'https://my.cerilas.com/api';

type StatsData = {
  totalPatients: number;
  activeConversations: number;
  totalMessages: number;
  aiMessages: number;
  aiErrors: number;
  activeAdmins: number;
  avgAge: number;
  genderCounts: Record<string, number>;
  topUsers: { name: string; messageCount: number }[];
  adminsStats: { name: string; patientCount: number }[];
};

export default function StatsScreen() {
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('all');

  const [reportEmails, setReportEmails] = useState('');
  const [savingEmails, setSavingEmails] = useState(false);

  const [reportPhones, setReportPhones] = useState('');
  const [savingPhones, setSavingPhones] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchStats = async (selectedPeriod: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/admin/stats?period=${selectedPeriod}`, { headers });
      setStats(res.data);
    } catch (e: any) {
      console.warn('Stats fetch error:', e);
      setError('İstatistikler alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/settings`, { headers });
      if (res.data) {
        if (res.data.daily_report_emails) setReportEmails(res.data.daily_report_emails);
        if (res.data.daily_report_phones) setReportPhones(res.data.daily_report_phones);
      }
    } catch (e) {
      console.warn('Settings fetch error', e);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats(period);
      fetchSettings();
    }
  }, [user, period]);

  const saveSetting = async (key: string, value: string, setSaving: (val: boolean) => void) => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/settings`, { key, value }, { headers });
      Toast.show({ type: 'success', text1: 'Başarılı', text2: 'Ayar kaydedildi.' });
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Hata', text2: 'Ayar kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500 font-medium">Yetkiniz yok.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#07090f]">
      <AppHeader
        right={
          <TouchableOpacity onPress={() => fetchStats(period)} style={{ padding: 8 }}>
            <RefreshCw size={22} color="#ffffff" />
          </TouchableOpacity>
        }
      />
      <View className="flex-1 bg-gray-50">

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        {/* Header & Period Selector */}
        <View className="mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-indigo-100 rounded-xl items-center justify-center mr-3">
              <BarChart2 size={20} color="#4f46e5" />
            </View>
            <Text className="text-2xl font-bold text-gray-900">İstatistikler</Text>
          </View>
        </View>

        <View className="mb-6 bg-gray-200 rounded-xl p-1 flex-row">
          {[{ id: 'all', label: 'Tüm Zamanlar' }, { id: '30d', label: 'Son 30 Gün' }].map(p => (
            <TouchableOpacity 
              key={p.id}
              onPress={() => setPeriod(p.id)}
              className="flex-1 py-2 items-center rounded-lg"
              style={{ 
                backgroundColor: period === p.id ? '#ffffff' : 'transparent',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: period === p.id ? 0.05 : 0,
                shadowRadius: 1,
                elevation: period === p.id ? 1 : 0
              }}
            >
              <Text style={{ 
                fontSize: 14, 
                fontWeight: 'bold', 
                color: period === p.id ? '#4f46e5' : '#6b7280' 
              }}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !stats ? (
          <View className="mt-4">
            <View className="flex-row flex-wrap justify-between mb-6">
              {[1, 2, 3, 4].map(i => (
                <View key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm w-[48%] mb-4">
                  <View className="flex-row items-center mb-2">
                    <Skeleton width={32} height={32} borderRadius={8} className="mr-2" />
                    <Skeleton width={60} height={12} />
                  </View>
                  <Skeleton width="100%" height={24} className="mt-2" />
                </View>
              ))}
            </View>
            <View className="bg-white rounded-2xl p-5 border border-gray-100 mb-6 shadow-sm">
              <Skeleton width={120} height={16} className="mb-6" />
              <View className="flex-row justify-between">
                <View className="items-center flex-1 space-y-2">
                  <Skeleton width={50} height={10} />
                  <Skeleton width={40} height={24} />
                </View>
                <View className="items-center flex-1 border-l border-r border-gray-100 space-y-2">
                  <Skeleton width={50} height={10} />
                  <Skeleton width={40} height={24} />
                </View>
                <View className="items-center flex-1 space-y-2">
                  <Skeleton width={50} height={10} />
                  <Skeleton width={40} height={24} />
                </View>
              </View>
            </View>
          </View>
        ) : error ? (
          <Text className="text-red-500 text-center mt-4">{error}</Text>
        ) : stats ? (
          <>
            {/* KPI Cards */}
            <View className="flex-row flex-wrap justify-between mb-6">
              <StatCard title="Kayıtlı Hasta" value={stats.totalPatients} icon={<Users size={20} color="#2563eb" />} bg="bg-blue-50" />
              <StatCard title="Aktif Admin" value={stats.activeAdmins} icon={<Users size={20} color="#9333ea" />} bg="bg-purple-50" />
              <StatCard title="Sohbetler" value={stats.activeConversations} icon={<MessageSquare size={20} color="#16a34a" />} bg="bg-green-50" />
              <StatCard title="Yaş Ort." value={stats.avgAge} icon={<Users size={20} color="#ea580c" />} bg="bg-orange-50" />
            </View>

            {/* Message Stats */}
            <View className="bg-white rounded-2xl p-5 border border-gray-100 mb-6 shadow-sm">
              <Text className="font-bold text-gray-900 mb-4">Mesaj Verileri</Text>
              <View className="flex-row justify-between">
                <View className="items-center flex-1">
                  <Text className="text-xs text-gray-500 font-bold mb-1">TOPLAM</Text>
                  <Text className="text-2xl font-black text-gray-900">{stats.totalMessages}</Text>
                </View>
                <View className="items-center flex-1 border-l border-r border-gray-100">
                  <Text className="text-xs text-gray-500 font-bold mb-1">YAPAY ZEKA</Text>
                  <Text className="text-2xl font-black text-indigo-600">{stats.aiMessages}</Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-xs text-red-500 font-bold mb-1">HATALAR</Text>
                  <Text className="text-2xl font-black text-red-600">{stats.aiErrors}</Text>
                </View>
              </View>
            </View>

            {/* Settings */}
            <View className="bg-white rounded-2xl p-5 border border-gray-100 mb-6 shadow-sm">
              <View className="flex-row items-center mb-2">
                <Mail size={18} color="#4f46e5" />
                <Text className="font-bold text-gray-900 ml-2">Günlük E-posta Raporu</Text>
              </View>
              <TextInput 
                value={reportEmails} 
                onChangeText={setReportEmails} 
                placeholder="admin@mail.com" 
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-3 text-gray-900" 
              />
              <TouchableOpacity onPress={() => saveSetting('daily_report_emails', reportEmails, setSavingEmails)} disabled={savingEmails} className="bg-indigo-600 rounded-xl py-2 items-center">
                {savingEmails ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white font-bold">Kaydet</Text>}
              </TouchableOpacity>
            </View>

            <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <View className="flex-row items-center mb-2">
                <Smartphone size={18} color="#16a34a" />
                <Text className="font-bold text-gray-900 ml-2">Günlük SMS Raporu</Text>
              </View>
              <TextInput 
                value={reportPhones} 
                onChangeText={setReportPhones} 
                placeholder="5XX XXX XX XX" 
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-3 text-gray-900" 
              />
              <TouchableOpacity onPress={() => saveSetting('daily_report_phones', reportPhones, setSavingPhones)} disabled={savingPhones} className="bg-green-600 rounded-xl py-2 items-center">
                {savingPhones ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white font-bold">Kaydet</Text>}
              </TouchableOpacity>
            </View>
          </>
        ) : null}

      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function StatCard({ title, value, icon, bg }: { title: string, value: number, icon: React.ReactNode, bg: string }) {
  return (
    <View className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm w-[48%] mb-4">
      <View className={`w-10 h-10 rounded-xl items-center justify-center mb-3 ${bg}`}>
        {icon}
      </View>
      <Text className="text-2xl font-black text-gray-900 mb-1">{value}</Text>
      <Text className="text-xs font-bold text-gray-500 uppercase">{title}</Text>
    </View>
  );
}
