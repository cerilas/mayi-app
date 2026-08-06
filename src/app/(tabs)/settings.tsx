import React, { useEffect, useState, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, TextInput, ActivityIndicator, Alert, Platform, Modal, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { LogOut, User, ShieldCheck, ChevronRight, Users, Key, Settings, FileText, UserCircle, Activity, Eye, Mail, MessageSquare, Plus, Trash2, Smartphone, CheckCircle2, X, AlertCircle, Bot, Brain, Sparkles } from 'lucide-react-native';
import { useSettingsStore } from '../../store/useSettingsStore';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppHeader } from '../../components/app-header';
import { Skeleton } from '../../components/skeleton';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';
import { useRouter } from 'expo-router';

const API_URL = 'https://my.cerilas.com/api';

function AccordionItem({ title, icon, expanded, onToggle, children }: any) {
  return (
    <View className="bg-white rounded-3xl mb-4 shadow-sm border border-gray-100 overflow-hidden">
      <TouchableOpacity onPress={onToggle} className="flex-row items-center justify-between p-5 active:bg-gray-50">
        <View className="flex-row items-center">
          {icon}
          <Text className="text-base font-semibold text-text-primary ml-3">{title}</Text>
        </View>
        <ChevronRight color="#d1d5db" size={20} style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }} />
      </TouchableOpacity>
      {expanded && (
        <View className="p-5 border-t border-gray-100 bg-gray-50/50">
          {children}
        </View>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const { user, token, logout } = useAuthStore();
  const { colors, themeId, themeColors, setTheme } = useTheme();
  const { assistantIcon, setAssistantIcon } = useSettingsStore();
  const router = useRouter();

  const isAdmin = user?.role === 'admin';
  const isPatient = user?.role === 'patient';
  const headers = { Authorization: `Bearer ${token}` };

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Toggle helper
  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  // --- Hesap & Kullanım (All) ---
  const [acCurrentPw, setAcCurrentPw] = useState("");
  const [acNewPw, setAcNewPw] = useState("");
  const [acConfirmPw, setAcConfirmPw] = useState("");
  const [acLoading, setAcLoading] = useState(false);
  const [usageData, setUsageData] = useState<any>(null);

  const [isFetchingUsage, setIsFetchingUsage] = useState(false);
  const fetchUsage = useCallback(async () => {
    setIsFetchingUsage(true);
    try {
      const res = await axios.get(`${API_URL}/users/usage`, { headers });
      setUsageData(res.data);
    } catch (err) {} finally { setIsFetchingUsage(false); }
  }, []);

  const handleChangePassword = async () => {
    if (acNewPw !== acConfirmPw) {
      Toast.show({ type: 'error', text1: 'Hata', text2: "Yeni şifreler eşleşmiyor." });
      return;
    }
    if (acNewPw.length < 6) {
      Toast.show({ type: 'error', text1: 'Hata', text2: "Yeni şifre en az 6 karakter olmalı." });
      return;
    }
    setAcLoading(true);
    try {
      await axios.put(`${API_URL}/account/password`, { currentPassword: acCurrentPw, newPassword: acNewPw }, { headers });
      Toast.show({ type: 'success', text1: 'Başarılı', text2: "Şifreniz başarıyla güncellendi." });
      setAcCurrentPw(""); setAcNewPw(""); setAcConfirmPw("");
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Hata', text2: err.response?.data?.error || "Şifre güncellenemedi." });
    } finally {
      setAcLoading(false);
    }
  };

  // --- Talimatlar (Admin & Physio) ---
  const [instructions, setInstructions] = useState({ sys: '', patientSys: '', base: '' });
  const [instLoading, setInstLoading] = useState(false);

  const [isFetchingInst, setIsFetchingInst] = useState(false);
  const fetchInstructions = useCallback(async () => {
    setIsFetchingInst(true);
    try {
      const res = await axios.get(`${API_URL}/settings`, { headers });
      setInstructions({
        sys: res.data.system_instruction || '',
        patientSys: res.data.patient_system_instruction || '',
        base: res.data.base_instruction || ''
      });
    } catch (err) {} finally { setIsFetchingInst(false); }
  }, []);

  const saveInstructions = async () => {
    setInstLoading(true);
    try {
      await axios.put(`${API_URL}/settings`, { key: 'base_instruction', value: instructions.base }, { headers });
      await axios.put(`${API_URL}/settings`, { key: 'system_instruction', value: instructions.sys }, { headers });
      if (isAdmin) {
        await axios.put(`${API_URL}/settings`, { key: 'patient_system_instruction', value: instructions.patientSys }, { headers });
      }
      Toast.show({ type: 'success', text1: 'Başarılı', text2: "Talimatlar kaydedildi." });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Hata', text2: "Talimatlar kaydedilemedi." });
    } finally {
      setInstLoading(false);
    }
  };

  // --- Genel & API (Admin) ---
  const [apiKey, setApiKey] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [smsHeaders, setSmsHeaders] = useState<string[]>([]);
  const [activeHeader, setActiveHeader] = useState("");
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [patientModel, setPatientModel] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  const [isFetchingGen, setIsFetchingGen] = useState(false);
  const fetchGeneral = useCallback(async () => {
    setIsFetchingGen(true);
    try {
      const [setRes, smsRes, modelsRes] = await Promise.all([
        axios.get(`${API_URL}/settings`, { headers }),
        axios.get(`${API_URL}/admin/sms/headers`, { headers }),
        axios.get(`${API_URL}/models`, { headers })
      ]);
      setApiKey(setRes.data.gemini_api_key || '');
      setActiveHeader(setRes.data.netgsm_active_header || '');
      setPatientModel(setRes.data.patient_default_model || '');
      if (smsRes.data.success) setSmsHeaders(smsRes.data.headers);
      if (modelsRes.data.gemini) setAvailableModels(modelsRes.data.gemini);
    } catch (err) {} finally { setIsFetchingGen(false); }
  }, []);

  const saveGeneralSetting = async (key: string, value: string, successMsg: string) => {
    setGenLoading(true);
    try {
      await axios.put(`${API_URL}/settings`, { key, value }, { headers });
      Toast.show({ type: 'success', text1: 'Başarılı', text2: successMsg });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Hata', text2: "Kaydedilemedi." });
    } finally {
      setGenLoading(false);
    }
  };

  // --- Kullanıcılar (Admin) ---
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ id: '', name: '', email: '', password: '', role: 'user' });

  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsForm, setSmsForm] = useState({ userId: '', phone: '', newPassword: '' });
  const [smsSubmitting, setSmsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/users`, { headers });
      setUsers(res.data);
    } catch (err) {} finally {
      setUsersLoading(false);
    }
  }, []);

  const revealUserPassword = async (id: string) => {
    try {
      const res = await axios.get(`${API_URL}/admin/users/${id}/password`, { headers });
      Alert.alert("Şifre", res.data.password || "Bilinmiyor");
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Hata', text2: "Şifre alınamadı" });
    }
  };

  const sendSms = (id: string) => {
    setSmsForm({ userId: id, phone: '', newPassword: '' });
    setShowSmsModal(true);
  };

  const handleSendSms = async () => {
    if (!smsForm.phone || !smsForm.newPassword) {
      Toast.show({ type: 'info', text1: 'Eksik Bilgi', text2: 'Telefon ve yeni şifre zorunludur' });
      return;
    }
    setSmsSubmitting(true);
    try {
      await axios.post(`${API_URL}/admin/sms`, smsForm, { headers });
      Toast.show({ type: 'success', text1: 'Başarılı', text2: "SMS başarıyla gönderildi." });
      setShowSmsModal(false);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Hata', text2: err.response?.data?.error || "Gönderilemedi" });
    } finally {
      setSmsSubmitting(false);
    }
  };

  const saveUser = async () => {
    try {
      const url = userForm.id ? `${API_URL}/admin/users/${userForm.id}` : `${API_URL}/admin/users`;
      const method = userForm.id ? 'patch' : 'post';
      await axios[method](url, userForm, { headers });
      Toast.show({ type: 'success', text1: 'Başarılı', text2: "Kullanıcı kaydedildi." });
      setShowUserModal(false);
      fetchUsers();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Hata', text2: err.response?.data?.error || "Kaydedilemedi." });
    }
  };

  // --- Lifecycle ---
  useEffect(() => {
    if (expandedSection === 'account' && !usageData) fetchUsage();
    if (expandedSection === 'instructions' && !instructions.sys) fetchInstructions();
    if (expandedSection === 'general' && !apiKey) fetchGeneral();
    if (expandedSection === 'users' && users.length === 0) fetchUsers();
  }, [expandedSection]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#07090f' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#07090f" />
      <AppHeader />
      <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.duration(600).springify()}>
          <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-100 items-center mt-2">
            <View className="w-20 h-20 bg-indigo-100 rounded-full items-center justify-center mb-4 border-4 border-white shadow-sm">
              <User color="#4f46e5" size={36} strokeWidth={1.5} />
            </View>
            <Text className="text-xl font-black text-gray-900 mb-1">{user?.name}</Text>
            <Text className="text-gray-500 font-medium mb-3">{user?.email}</Text>
            <View className="flex-row items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <ShieldCheck color="#6b7280" size={14} />
              <Text className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-2">
                {user?.role === 'admin' ? 'Yönetici' : user?.role === 'physiotherapist' ? 'Fizyoterapist' : user?.role === 'patient' ? 'Hasta' : 'Kullanıcı'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* --- HESAP & KULLANIM --- */}
        <Animated.View entering={FadeInDown.delay(100).duration(600).springify()}>
          <AccordionItem 
            title="Hesap ve Kullanım" 
            icon={<UserCircle color="#4f46e5" size={24} />} 
            expanded={expandedSection === 'account'} 
            onToggle={() => toggleSection('account')}
          >
            {isFetchingUsage ? (
              <View className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <View className="flex-row justify-between mb-4">
                  <Skeleton width={80} height={14} />
                  <Skeleton width={60} height={14} />
                </View>
                <Skeleton width="100%" height={12} borderRadius={6} className="mb-2" />
                <Skeleton width={100} height={10} />
              </View>
            ) : usageData && (
              <View className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <View className="flex-row justify-between items-end mb-2">
                  <Text className="text-xs font-bold text-indigo-900">Aktif Kullanım</Text>
                  <Text className="text-xs font-mono text-indigo-900">
                    <Text className="font-black text-base">{usageData.used}</Text> / {usageData.limit} Hak
                  </Text>
                </View>
                <View className="h-3 bg-indigo-200 rounded-full overflow-hidden mb-3">
                  <View 
                    className={`h-full rounded-full ${usageData.isExceeded ? 'bg-red-500' : 'bg-indigo-600'}`} 
                    style={{ width: `${Math.min(100, (usageData.used / usageData.limit) * 100)}%` }} 
                  />
                </View>
                <Text className="text-[11px] text-indigo-700">Yenilenme: {new Date(usageData.resetAt).toLocaleDateString()}</Text>
              </View>
            )}

            <Text className="text-sm font-bold text-gray-900 mb-3">Şifre Değiştir</Text>
            <TextInput secureTextEntry value={acCurrentPw} onChangeText={setAcCurrentPw} placeholder="Mevcut Şifre" placeholderTextColor="#9ca3af" className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-3 text-sm text-gray-900" />
            <TextInput secureTextEntry value={acNewPw} onChangeText={setAcNewPw} placeholder="Yeni Şifre" placeholderTextColor="#9ca3af" className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-3 text-sm text-gray-900" />
            <TextInput secureTextEntry value={acConfirmPw} onChangeText={setAcConfirmPw} placeholder="Yeni Şifre (Tekrar)" placeholderTextColor="#9ca3af" className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-sm text-gray-900" />
            <TouchableOpacity onPress={handleChangePassword} disabled={acLoading} className="bg-indigo-600 rounded-xl py-3 items-center">
              {acLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-sm">Şifreyi Güncelle</Text>}
            </TouchableOpacity>
          </AccordionItem>
        </Animated.View>

        {/* --- TALİMATLAR (Admin/Physio) --- */}
        {!isPatient && (
          <Animated.View entering={FadeInDown.delay(200).duration(600).springify()}>
            <AccordionItem 
              title="Talimatlar" 
              icon={<FileText color="#0284c7" size={24} />} 
              expanded={expandedSection === 'instructions'} 
              onToggle={() => toggleSection('instructions')}
            >
              {isFetchingInst ? (
                <View className="space-y-4 mb-4">
                  <Skeleton width={120} height={14} className="mb-2" />
                  <Skeleton width="100%" height={96} borderRadius={12} className="mb-4" />
                  <Skeleton width={120} height={14} className="mb-2" />
                  <Skeleton width="100%" height={128} borderRadius={12} className="mb-4" />
                </View>
              ) : (
                <>
                  <View className="flex-row items-center mb-2 gap-2">
                    <Text className="text-xs font-bold text-gray-700">Temel Talimat (Base Instruction)</Text>
                    {!instructions.base && (
                      <View className="bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex-row items-center">
                        <AlertCircle size={10} color="#dc2626" />
                        <Text className="text-[9px] font-bold text-red-600 ml-1">Kayıtlı Değil</Text>
                      </View>
                    )}
                  </View>
                  <TextInput multiline value={instructions.base} onChangeText={v => setInstructions({...instructions, base: v})} className="bg-white border border-gray-200 rounded-xl px-3 py-3 mb-4 text-xs h-24" style={{ textAlignVertical: 'top' }} />
                  
                  <View className="flex-row items-center mb-2 gap-2">
                    <Text className="text-xs font-bold text-gray-700">Sistem Talimatı (Physiotherapist)</Text>
                    {!instructions.sys && (
                      <View className="bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex-row items-center">
                        <AlertCircle size={10} color="#dc2626" />
                        <Text className="text-[9px] font-bold text-red-600 ml-1">Kayıtlı Değil</Text>
                      </View>
                    )}
                  </View>
                  <TextInput multiline value={instructions.sys} onChangeText={v => setInstructions({...instructions, sys: v})} className="bg-white border border-gray-200 rounded-xl px-3 py-3 mb-4 text-xs h-32" style={{ textAlignVertical: 'top' }} />

                  {isAdmin && (
                    <>
                      <View className="flex-row items-center mb-2 gap-2">
                        <Text className="text-xs font-bold text-gray-700">Sistem Talimatı (Patient)</Text>
                        {!instructions.patientSys && (
                          <View className="bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex-row items-center">
                            <AlertCircle size={10} color="#dc2626" />
                            <Text className="text-[9px] font-bold text-red-600 ml-1">Kayıtlı Değil</Text>
                          </View>
                        )}
                      </View>
                      <TextInput multiline value={instructions.patientSys} onChangeText={v => setInstructions({...instructions, patientSys: v})} className="bg-white border border-gray-200 rounded-xl px-3 py-3 mb-4 text-xs h-32" style={{ textAlignVertical: 'top' }} />
                    </>
                  )}

                  <TouchableOpacity onPress={saveInstructions} disabled={instLoading} className="bg-sky-600 rounded-xl py-3 items-center">
                    {instLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-sm">Talimatları Kaydet</Text>}
                  </TouchableOpacity>
                </>
              )}
            </AccordionItem>
          </Animated.View>
        )}

        {/* --- GENEL & API (Admin) --- */}
        {isAdmin && (
          <Animated.View entering={FadeInDown.delay(300).duration(600).springify()}>
            <AccordionItem 
              title="Genel & API" 
              icon={<Settings color="#eab308" size={24} />} 
              expanded={expandedSection === 'general'} 
              onToggle={() => toggleSection('general')}
            >
              {isFetchingGen ? (
                <View className="space-y-4 mb-4">
                  <Skeleton width={120} height={14} className="mb-2" />
                  <View className="flex-row mb-6"><Skeleton width="100%" height={44} borderRadius={12} /></View>
                  <Skeleton width={120} height={14} className="mb-2" />
                  <View className="flex-row gap-2 mb-6">
                    <Skeleton width={80} height={36} borderRadius={8} />
                    <Skeleton width={100} height={36} borderRadius={8} />
                  </View>
                  <Skeleton width={120} height={14} className="mb-2" />
                  <View className="flex-col gap-2 mb-4">
                    <Skeleton width="100%" height={44} borderRadius={8} />
                    <Skeleton width="100%" height={44} borderRadius={8} />
                  </View>
                </View>
              ) : (
                <>
                  <Text className="text-xs font-bold text-gray-700 mb-2">Gemini API Anahtarı</Text>
                  <View className="flex-row mb-6">
                <TextInput value={apiKey} onChangeText={setApiKey} placeholder="API Key" className="flex-1 bg-white border border-gray-200 rounded-l-xl px-4 py-3 text-xs" />
                <TouchableOpacity onPress={() => saveGeneralSetting('gemini_api_key', apiKey, 'API Key kaydedildi')} className="bg-yellow-500 rounded-r-xl px-4 justify-center items-center">
                  <Text className="text-white font-bold text-xs">Kaydet</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-xs font-bold text-gray-700 mb-2">SMS Gönderici Başlığı</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {smsHeaders.map(h => (
                  <TouchableOpacity key={h} onPress={() => setActiveHeader(h)} className={`px-3 py-2 rounded-lg border flex-row items-center gap-1 ${activeHeader === h ? 'bg-yellow-50 border-yellow-500' : 'bg-white border-gray-200'}`}>
                    <Text className={`text-xs ${activeHeader === h ? 'text-yellow-700 font-bold' : 'text-gray-600'}`}>{h}</Text>
                    {activeHeader === h && <CheckCircle2 size={14} color="#ca8a04" />}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => saveGeneralSetting('netgsm_active_header', activeHeader, 'Başlık kaydedildi')} className="bg-gray-800 rounded-xl py-3 mb-6 items-center">
                <Text className="text-white font-bold text-sm">Başlığı Kaydet</Text>
              </TouchableOpacity>

              <Text className="text-xs font-bold text-gray-700 mb-2">Hasta Varsayılan Modeli</Text>
              <View className="flex-col gap-2 mb-4">
                {availableModels.map(m => (
                  <TouchableOpacity key={m.id} onPress={() => setPatientModel(m.id)} className={`px-4 py-3 rounded-lg border flex-row items-center justify-between ${patientModel === m.id ? 'bg-yellow-50 border-yellow-500' : 'bg-white border-gray-200'}`}>
                    <Text className={`text-xs ${patientModel === m.id ? 'text-yellow-700 font-bold' : 'text-gray-600'}`}>{m.label}</Text>
                    {patientModel === m.id && <CheckCircle2 size={16} color="#ca8a04" />}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => saveGeneralSetting('patient_default_model', patientModel, 'Model kaydedildi')} className="bg-gray-800 rounded-xl py-3 items-center">
                <Text className="text-white font-bold text-sm">Modeli Kaydet</Text>
              </TouchableOpacity>
                </>
              )}
            </AccordionItem>
          </Animated.View>
        )}

        {/* --- KULLANICILAR (Admin) --- */}
        {isAdmin && (
          <Animated.View entering={FadeInDown.delay(400).duration(600).springify()}>
            <AccordionItem 
              title="Kullanıcılar" 
              icon={<Users color="#10b981" size={24} />} 
              expanded={expandedSection === 'users'} 
              onToggle={() => toggleSection('users')}
            >
              <TouchableOpacity onPress={() => { setUserForm({id:'', name:'', email:'', password:'', role:'user'}); setShowUserModal(true); }} className="flex-row items-center justify-center bg-emerald-100 py-3 rounded-xl mb-4">
                <Plus color="#059669" size={20} />
                <Text className="text-emerald-700 font-bold ml-2">Yeni Kullanıcı Ekle</Text>
              </TouchableOpacity>

              {usersLoading ? (
                <View className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <View key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                      <View className="flex-row justify-between items-center mb-3">
                        <View className="space-y-2">
                          <Skeleton width={120} height={16} />
                          <Skeleton width={80} height={12} />
                        </View>
                        <Skeleton width={50} height={20} borderRadius={6} />
                      </View>
                      <View className="flex-row border-t border-gray-100 pt-3 mt-1 gap-2">
                        <Skeleton className="flex-1" height={36} borderRadius={8} />
                        <Skeleton className="flex-1" height={36} borderRadius={8} />
                        <Skeleton className="flex-1" height={36} borderRadius={8} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="space-y-3">
                  {users.map(u => (
                    <View key={u.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <View className="flex-row justify-between items-center mb-3">
                        <View>
                          <Text className="font-bold text-gray-900">{u.name}</Text>
                          <Text className="text-xs text-gray-500">{u.email}</Text>
                        </View>
                        <View className="bg-gray-100 px-2 py-1 rounded-md">
                          <Text className="text-[10px] font-bold text-gray-600 uppercase">{u.role}</Text>
                        </View>
                      </View>
                      
                      <View className="flex-row border-t border-gray-100 pt-3 mt-1 gap-2">
                        <TouchableOpacity onPress={() => revealUserPassword(u.id)} className="flex-1 bg-gray-50 py-2 rounded-lg items-center flex-row justify-center">
                          <Eye size={14} color="#6b7280" />
                          <Text className="text-xs text-gray-600 font-medium ml-1">Şifre</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => sendSms(u.id)} className="flex-1 bg-gray-50 py-2 rounded-lg items-center flex-row justify-center">
                          <Smartphone size={14} color="#6b7280" />
                          <Text className="text-xs text-gray-600 font-medium ml-1">SMS</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setUserForm({...u, password: ''}); setShowUserModal(true); }} className="bg-indigo-50 px-4 py-2 rounded-lg items-center justify-center">
                          <Text className="text-xs text-indigo-700 font-medium">Düzenle</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </AccordionItem>
          </Animated.View>
        )}

        {/* Görünüm (Tema) */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <AccordionItem
            title="Görünüm"
            icon={<View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.brand }} /></View>}
            expanded={expandedSection === 'appearance'}
            onToggle={() => toggleSection('appearance')}
          >
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Renk Teması</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {themeColors.map(tc => (
                <TouchableOpacity
                  key={tc.id}
                  onPress={() => setTheme(tc.id)}
                  style={{
                    alignItems: 'center',
                    width: 60,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: tc.hex,
                      borderWidth: themeId === tc.id ? 3 : 2,
                      borderColor: themeId === tc.id ? tc.hex : '#e5e7eb',
                      shadowColor: tc.hex,
                      shadowOpacity: themeId === tc.id ? 0.45 : 0,
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 6,
                      elevation: themeId === tc.id ? 4 : 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {themeId === tc.id && (
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 10, color: themeId === tc.id ? tc.hex : '#9ca3af', marginTop: 5, fontWeight: themeId === tc.id ? '700' : '400' }}>{tc.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginTop: 24 }}>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Yapay Zeka Asistan İkonu</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {[
                  { id: 'pulse', label: 'Pulse', icon: <Activity color={assistantIcon === 'pulse' ? '#fff' : '#6b7280'} size={24} /> },
                  { id: 'robot', label: 'Robot', icon: <Bot color={assistantIcon === 'robot' ? '#fff' : '#6b7280'} size={24} /> },
                  { id: 'spark', label: 'Spark', icon: <Sparkles color={assistantIcon === 'spark' ? '#fff' : '#6b7280'} size={24} /> },
                  { id: 'brain', label: 'Brain', icon: <Brain color={assistantIcon === 'brain' ? '#fff' : '#6b7280'} size={24} /> },
                  { id: 'my-logo', label: 'MY Logo', icon: <Text style={{ color: assistantIcon === 'my-logo' ? '#fff' : '#6b7280', fontSize: 16, fontWeight: 'bold' }}>MY</Text> }
                ].map(item => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setAssistantIcon(item.id)}
                    style={{
                      alignItems: 'center',
                      width: 64,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        backgroundColor: assistantIcon === item.id ? colors.brand : '#f3f4f6',
                        borderWidth: 2,
                        borderColor: assistantIcon === item.id ? colors.brand : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: assistantIcon === item.id ? colors.brand : '#000',
                        shadowOpacity: assistantIcon === item.id ? 0.3 : 0,
                        shadowOffset: { width: 0, height: 4 },
                        shadowRadius: 8,
                        elevation: assistantIcon === item.id ? 4 : 0,
                      }}
                    >
                      {item.icon}
                    </View>
                    <Text style={{ fontSize: 11, color: assistantIcon === item.id ? colors.brand : '#6b7280', marginTop: 6, fontWeight: assistantIcon === item.id ? '600' : '400' }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </AccordionItem>
        </Animated.View>

        {/* Tıbbi Uyarı ve Kaynaklar */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <AccordionItem
            title="Tıbbi Uyarı & Kaynaklar"
            icon={<AlertCircle color="#ef4444" size={24} />}
            expanded={expandedSection === 'medical_warning'}
            onToggle={() => toggleSection('medical_warning')}
          >
            <View className="bg-red-50 p-4 rounded-xl border border-red-200 mb-4">
              <View className="flex-row items-center mb-2">
                <AlertCircle size={20} color="#dc2626" />
                <Text className="text-red-700 font-bold ml-2">Tıbbi Sorumluluk Reddi</Text>
              </View>
              <Text className="text-red-900 text-xs leading-relaxed">
                Bu uygulama fizyoterapistler ve sağlık profesyonelleri için bir asistan aracıdır. Bu uygulama üzerinden elde edilen analizler ve egzersiz planları, bir doktor tavyesinin veya tıbbi teşhisin yerine geçmez. Lütfen herhangi bir tıbbi karar vermeden önce mutlaka yetkili bir hekime danışınız.
              </Text>
            </View>

            <View className="bg-white p-4 rounded-xl border border-gray-200">
              <View className="flex-row items-center mb-2">
                <FileText size={20} color="#4b5563" />
                <Text className="text-gray-800 font-bold ml-2">Bilgi Kaynakları (Citations)</Text>
              </View>
              <Text className="text-gray-600 text-xs leading-relaxed">
                Uygulama içerisindeki genel fizyoterapi tavsiyeleri, postür analiz yönergeleri ve egzersiz programları uluslararası kabul görmüş fizyoterapi prensiplerine (WHO ve yerel sağlık bakanlıkları rehberleri) ve tıp literatüründeki temel anatomi/kinesiyoloji kurallarına dayanarak oluşturulmaktadır. Detaylı bilimsel kaynaklar için profesyonel literatürü takip ediniz.
              </Text>
            </View>
          </AccordionItem>
        </Animated.View>

        {/* Legal Text Button */}
        <TouchableOpacity 
          onPress={() => router.push('/legal')}
          className="bg-white rounded-2xl p-4 flex-row items-center shadow-sm border border-gray-100 active:bg-gray-50 mt-6"
        >
          <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center mr-3">
            <ShieldCheck color="#4f46e5" size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-bold text-base">Hakkında & Yasal Metinler</Text>
            <Text className="text-gray-500 text-xs mt-0.5">Kullanım koşulları ve gizlilik</Text>
          </View>
          <ChevronRight color="#d1d5db" size={20} />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={logout}
          className="bg-white rounded-2xl p-4 flex-row items-center justify-center shadow-sm border border-red-100 active:bg-red-50 mt-4"
        >
          <LogOut color="#ef4444" size={20} />
          <Text className="text-red-500 font-bold text-base ml-2">Çıkış Yap</Text>
        </TouchableOpacity>
        
        <View className="mt-12 mb-4 items-center">
          <Text className="text-center text-gray-400 text-[10px] font-medium uppercase tracking-widest">Mayi App v1.0.0</Text>
          <Text className="text-center text-gray-300 text-[9px] font-medium uppercase tracking-widest mt-1">cerilas</Text>
        </View>

      </ScrollView>

      {/* User Modal */}
      <Modal visible={showUserModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white rounded-3xl p-6 shadow-xl">
            <Text className="text-lg font-black text-gray-900 mb-4">{userForm.id ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</Text>
            
            <TextInput value={userForm.name} onChangeText={v => setUserForm({...userForm, name: v})} placeholder="Ad Soyad" className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 text-sm" />
            <TextInput value={userForm.email} onChangeText={v => setUserForm({...userForm, email: v})} placeholder="E-posta" keyboardType="email-address" autoCapitalize="none" className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 text-sm" />
            <TextInput value={userForm.password} onChangeText={v => setUserForm({...userForm, password: v})} placeholder={userForm.id ? "Şifre (Değiştirmek istemiyorsanız boş bırakın)" : "Şifre"} secureTextEntry className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 text-sm" />
            
            <View className="flex-row gap-2 mb-6">
              {['user', 'physiotherapist', 'admin'].map(r => (
                <TouchableOpacity key={r} onPress={() => setUserForm({...userForm, role: r})} className={`flex-1 py-2 rounded-lg border items-center ${userForm.role === r ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-200'}`}>
                  <Text className={`text-[10px] font-bold uppercase ${userForm.role === r ? 'text-indigo-700' : 'text-gray-500'}`}>{r === 'user' ? 'Kullanıcı' : r === 'physiotherapist' ? 'Fizyo' : 'Admin'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setShowUserModal(false)} className="flex-1 bg-gray-100 py-3 rounded-xl items-center">
                <Text className="text-gray-700 font-bold">İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveUser} className="flex-1 bg-indigo-600 py-3 rounded-xl items-center">
                <Text className="text-white font-bold">Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SMS Modal */}
      <Modal visible={showSmsModal} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-black/60 justify-center items-center px-4">
          <View className="bg-white rounded-3xl p-6 w-full shadow-lg">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-bold text-gray-900">SMS Gönder</Text>
              <TouchableOpacity onPress={() => setShowSmsModal(false)} className="p-2 bg-gray-100 rounded-full">
                <X color="#4b5563" size={20} />
              </TouchableOpacity>
            </View>
            <View className="mb-4">
              <Text className="text-xs font-bold text-gray-700 mb-2">Telefon Numarası</Text>
              <TextInput value={smsForm.phone} onChangeText={t => setSmsForm({...smsForm, phone: t})} placeholder="5551234567" keyboardType="numeric" maxLength={10} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" />
              <Text className="text-[10px] text-gray-500 mt-1">Başında 0 olmadan 10 hane girin.</Text>
            </View>
            <View className="mb-6">
              <Text className="text-xs font-bold text-gray-700 mb-2">Yeni Şifre (Zorunlu)</Text>
              <TextInput value={smsForm.newPassword} onChangeText={t => setSmsForm({...smsForm, newPassword: t})} placeholder="En az 6 karakter" className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" />
              <Text className="text-[10px] text-gray-500 mt-1">Bu şifre sisteme kaydedilecek ve SMS olarak gönderilecektir.</Text>
            </View>
            
            <TouchableOpacity onPress={handleSendSms} disabled={smsSubmitting} className="bg-indigo-600 rounded-xl py-4 items-center">
              {smsSubmitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Gönder</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}
