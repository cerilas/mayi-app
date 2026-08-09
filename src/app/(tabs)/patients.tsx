import Toast from 'react-native-toast-message';
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  Platform, ActivityIndicator, Alert, Modal, ScrollView, Image, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Users, Plus, Search, Edit2, Trash2, Key, MessageCircle, 
  ShieldAlert, X, Image as ImageIcon, ChevronRight, User, Activity
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/useAuthStore';
import { BrandLogo } from '../../components/brand-logo';
import { AppHeader } from '../../components/app-header';
import { Skeleton } from '../../components/skeleton';

const API_URL = 'https://my.cerilas.com/api';

const EMPTY_FORM = {
  name: "", email: "", password: "", photo: "", age: "", phone: "", 
  gender: "", shortDescription: "", longDetails: "", clinicalOpinion: "", 
  videoLinks: [] as string[], responsibleAdminId: ""
};

export default function PatientsScreen() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  // Pagination & Data State
  const [patients, setPatients] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [smsTarget, setSmsTarget] = useState<any>(null);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsPassword, setSmsPassword] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);

  const [rightsTarget, setRightsTarget] = useState<any>(null);
  const [rightsAmount, setRightsAmount] = useState('10');
  const [rightsLoading, setRightsLoading] = useState(false);

  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [admins, setAdmins] = useState<any[]>([]);

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'physiotherapist';

  useEffect(() => {
    if (isStaff) {
      fetchPatients(1, search);
      fetchAdmins();
    }
  }, [user]);

  const fetchAdmins = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/users`, { headers });
      if (Array.isArray(res.data)) {
        setAdmins(res.data.filter((u: any) => u.role === 'admin' || u.role === 'physiotherapist'));
      }
    } catch (e) {
      console.warn('Admins fetch err:', e);
    }
  };

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPatients(1, search);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const fetchPatients = async (pageNum = 1, searchQuery = search, isRefresh = false) => {
    if (pageNum === 1 && !isRefresh) setLoading(true);
    if (pageNum > 1) setLoadingMore(true);
    
    try {
      const res = await axios.get(`${API_URL}/admin/patients`, { 
        headers, 
        params: { page: pageNum, limit: 15, search: searchQuery },
        timeout: 10000 
      });
      
      const newItems = res.data.items || [];
      if (pageNum === 1) {
        setPatients(newItems);
      } else {
        setPatients(prev => [...prev, ...newItems]);
      }
      setPage(res.data.page);
      setTotalPages(res.data.totalPages);
    } catch (e) {
      console.warn('Patients fetch err:', e);
      if (pageNum === 1) Toast.show({ type: 'error', text1: 'Hata', text2: 'Hastalar alınamadı.' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPatients(1, search, true);
  };

  const loadMore = () => {
    if (!loadingMore && page < totalPages) {
      fetchPatients(page + 1, search);
    }
  };

  const handleRevealPassword = async (userId: string) => {
    if (revealedPasswords[userId]) {
      const newRevealed = { ...revealedPasswords };
      delete newRevealed[userId];
      setRevealedPasswords(newRevealed);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/admin/users/${userId}/password`, { headers, timeout: 5000 });
      setRevealedPasswords(prev => ({ ...prev, [userId]: res.data.password }));
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Hata', text2: 'Şifre alınamadı.' });
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Emin misiniz?', 'Hastayı ve tüm verilerini silmek üzeresiniz.', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await axios.delete(`${API_URL}/admin/patients/${id}`, { headers, timeout: 10000 });
            setPatients(patients.filter(p => p.id !== id));
            Toast.show({ type: 'success', text1: 'Başarılı', text2: 'Hasta silindi.' });
          } catch (e) {
            Toast.show({ type: 'error', text1: 'Hata', text2: 'Hasta silinemedi.' });
          }
        } 
      }
    ]);
  };

  const openEdit = (p: any) => {
    setEditingPatient(p);
    setForm({
      name: p.name,
      email: p.email,
      password: "",
      photo: p.patientProfile?.photo || "",
      age: p.patientProfile?.age?.toString() || "",
      phone: p.patientProfile?.phone || "",
      gender: p.patientProfile?.gender || "",
      shortDescription: p.patientProfile?.shortDescription || "",
      longDetails: p.patientProfile?.longDetails || "",
      clinicalOpinion: p.patientProfile?.clinicalOpinion || "",
      videoLinks: p.patientProfile?.videoLinks || [],
      responsibleAdminId: p.patientProfile?.responsibleAdminId || ""
    });
    setShowForm(true);
  };

  const handlePhotoUpload = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setFormLoading(true);
      try {
        const localUri = result.assets[0].uri;
        const filename = localUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : `image`;

        const fd = new FormData();
        fd.append('files', { uri: localUri, name: filename, type } as any);
        
        const res = await axios.post(`${API_URL}/upload`, fd, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' },
          timeout: 20000
        });
        
        if (res.data.attachments?.[0]) {
          const filePath: string = res.data.attachments[0].filePath;
          // filePath is stored as 'uploads/xxx.jpg', but /api/files/ expects just the filename
          const fileName = filePath.split('/').pop() ?? filePath;
          setForm({ ...form, photo: `/api/files/${fileName}` });
        }
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Hata', text2: 'Fotoğraf yüklenemedi.' });
      } finally {
        setFormLoading(false);
      }
    }
  };

  const savePatient = async () => {
    setFormError(null);
    if (!form.name || !form.phone) {
      setFormError('Ad ve telefon numarası zorunludur.');
      return;
    }

    setFormLoading(true);
    try {
      const payload = { ...form, age: form.age ? parseInt(form.age) : null };
      if (editingPatient) {
        await axios.patch(`${API_URL}/admin/patients/${editingPatient.id}`, payload, { headers, timeout: 15000 });
      } else {
        await axios.post(`${API_URL}/admin/patients`, payload, { headers, timeout: 15000 });
      }
      setShowForm(false);
      setFormError(null);
      fetchPatients(1, search, true);
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Hasta kaydedilemedi. Lütfen bağlantınızı kontrol edin.');
    } finally {
      setFormLoading(false);
    }
  };

  const openSmsModal = async (p: any) => {
    setSmsTarget(p);
    setSmsPhone(p.patientProfile?.phone || "");
    setSmsPassword(revealedPasswords[p.id] || "");
    if (!revealedPasswords[p.id]) {
      try {
        const res = await axios.get(`${API_URL}/admin/users/${p.id}/password`, { headers, timeout: 5000 });
        setSmsPassword(res.data.password);
      } catch {}
    }
  };

  const sendSms = async () => {
    if (!smsPhone) return Toast.show({ type: 'error', text1: 'Hata', text2: 'Telefon numarası eksik.' });
    setSmsLoading(true);
    try {
      await axios.post(`${API_URL}/admin/sms`, { userId: smsTarget.id, phone: smsPhone, password: smsPassword }, { headers, timeout: 10000 });
      Toast.show({ type: 'success', text1: 'Başarılı', text2: 'SMS gönderildi.' });
      setSmsTarget(null);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Hata', text2: 'SMS gönderilemedi.' });
    } finally {
      setSmsLoading(false);
    }
  };

  const saveRights = async (direction: 'add' | 'subtract') => {
    const parsed = parseInt(rightsAmount, 10);
    if (isNaN(parsed) || parsed <= 0) {
      Toast.show({ type: 'error', text1: 'Hata', text2: 'Geçerli bir sayı girin.' });
      return;
    }
    const finalAmount = direction === 'subtract' ? -parsed : parsed;
    setRightsLoading(true);
    try {
      await axios.post(`${API_URL}/admin/patients/${rightsTarget.id}/rights`, { amount: finalAmount, action: 'add' }, { headers, timeout: 10000 });
      Toast.show({ type: 'success', text1: 'Başarılı', text2: direction === 'add' ? `${parsed} hak eklendi.` : `${parsed} hak düşürüldü.` });
      setRightsTarget(null);
      fetchPatients(page, search, true);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Hata', text2: 'İşlem başarısız.' });
    } finally {
      setRightsLoading(false);
    }
  };

  const renderPatient = ({ item }: { item: any }) => {
    const photoRaw: string | undefined | null = item.patientProfile?.photo;
    const initial = item.name ? item.name.charAt(0).toUpperCase() : '?';
    const API_ORIGIN = API_URL.replace('/api', '');

    const photoUri = photoRaw
      ? (photoRaw.startsWith('http')
          ? photoRaw
          : `${API_ORIGIN}${photoRaw.startsWith('/') ? '' : '/'}${photoRaw}`)
      : null;

    return (
      <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm shadow-indigo-100 border border-indigo-50">
        <View className="flex-row items-center mb-4 border-b border-gray-50 pb-4">
          
          {/* AVATAR PLACEHOLDER OR IMAGE */}
          <View className="w-14 h-14 rounded-full bg-indigo-100 items-center justify-center mr-4 border-2 border-white shadow-sm">
            {photoUri ? (
              <Image 
                source={{ uri: photoUri, headers: { Authorization: `Bearer ${token}` } }} 
                className="w-full h-full rounded-full" 
              />
            ) : (
              <Text className="text-xl font-black text-indigo-500">{initial}</Text>
            )}
          </View>

          <View className="flex-1">
            <Text className="font-extrabold text-gray-900 text-lg" numberOfLines={1}>{item.name}</Text>
            <Text className="text-gray-400 text-xs font-medium mt-0.5">{item.email}</Text>
          </View>

          {isAdmin && (
            <TouchableOpacity onPress={() => openEdit(item)} className="p-2 bg-indigo-50 rounded-full">
               <Edit2 size={16} color="#4f46e5" />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row">
            <View className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 mr-2 flex-row items-center">
              <ShieldAlert size={12} color="#059669" />
              <Text className="text-emerald-700 text-xs font-bold ml-1">Kalan Hak: {item.usageLimit - item.usageUsed}</Text>
            </View>
          </View>
          {revealedPasswords[item.id] && (
            <View className="bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
              <Text className="text-amber-700 text-xs font-bold">Şifre: {revealedPasswords[item.id]}</Text>
            </View>
          )}
        </View>
        
        {/* ACTION BUTTONS — Admin only */}
        {isAdmin && (
        <View className="flex-row items-center justify-between pt-1">
          <TouchableOpacity onPress={() => handleRevealPassword(item.id)} className="flex-row items-center justify-center bg-gray-50 rounded-xl px-2 py-2 flex-1 mr-2">
            <Key size={14} color="#6b7280" />
            <Text className="text-gray-600 text-[10px] font-bold ml-1">Şifre</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => openSmsModal(item)} className="flex-row items-center justify-center bg-teal-50 rounded-xl px-2 py-2 flex-1 mr-2">
            <MessageCircle size={14} color="#0d9488" />
            <Text className="text-teal-700 text-[10px] font-bold ml-1">SMS</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => router.push({ pathname: '/posture', params: { userId: item.id } })} className="flex-row items-center justify-center bg-orange-50 rounded-xl px-2 py-2 flex-1 mr-2">
            <Activity size={14} color="#ea580c" />
            <Text className="text-orange-700 text-[10px] font-bold ml-1">Postür</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setRightsTarget(item)} className="flex-row items-center justify-center bg-purple-50 rounded-xl px-2 py-2 flex-1 mr-2">
            <Users size={14} color="#7e22ce" />
            <Text className="text-purple-700 text-[10px] font-bold ml-1">Hak</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleDelete(item.id)} className="w-10 h-10 items-center justify-center bg-red-50 rounded-xl">
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
        )}
      </View>
    );
  };

  if (!isStaff) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500 font-medium">Yetkiniz yok.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#07090f]">
      <AppHeader
        right={isAdmin ? (
          <TouchableOpacity 
            onPress={() => { setEditingPatient(null); setForm({...EMPTY_FORM, responsibleAdminId: user?.role === 'physiotherapist' ? user.id : ""}); setShowForm(true); }}
            style={{ padding: 8 }}
            accessibilityLabel="Yeni hasta"
          >
            <Plus size={22} color="#ffffff" />
          </TouchableOpacity>
        ) : undefined}
      />
      <View className="flex-1 bg-[#f8fafc]">
        {/* Search Bar */}
        <View className="px-5 pt-4 pb-2 bg-[#f8fafc]">
          <View className="bg-white rounded-2xl flex-row items-center px-4 py-3 shadow-sm border border-gray-100">
          <Search size={20} color="#94a3b8" />
          <TextInput 
            placeholder="Hasta ara (isim veya e-posta)..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-3 text-gray-900 font-medium text-base"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList 
        data={patients}
        keyExtractor={item => item.id}
        renderItem={renderPatient}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4f46e5" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => loadingMore ? <ActivityIndicator size="small" color="#4f46e5" className="my-4" /> : null}
        ListEmptyComponent={
          loading ? (
            <View className="px-4 mt-2 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <View key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex-row items-center mb-4">
                  <Skeleton width={56} height={56} borderRadius={28} className="mr-4" />
                  <View className="flex-1 space-y-2">
                    <Skeleton width="60%" height={16} />
                    <Skeleton width="40%" height={12} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center justify-center mt-20">
              <View className="w-20 h-20 bg-indigo-50 rounded-full items-center justify-center mb-4">
                <Users size={32} color="#4f46e5" />
              </View>
              <Text className="text-gray-900 font-bold text-lg">Kayıt Bulunamadı</Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">Arama kriterlerinize uygun hasta yok veya sisteme henüz hasta eklenmemiş.</Text>
            </View>
          )
        }
      />

      {/* PATIENT FORM MODAL */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowForm(false); setFormError(null); }}
      >
        <SafeAreaView className="flex-1 bg-[#f8fafc]">
          <View className="flex-row items-center justify-between p-5 bg-white border-b border-gray-100 shadow-sm z-10">
            <Text className="text-xl font-black text-gray-900">{editingPatient ? 'Hastayı Düzenle' : 'Yeni Hasta Profili'}</Text>
            <TouchableOpacity onPress={() => { setShowForm(false); setFormError(null); }} className="bg-gray-100 p-2 rounded-full">
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Inline error banner — always visible inside the modal */}
          {formError && (
            <View style={{ backgroundColor: '#fef2f2', borderBottomWidth: 1, borderBottomColor: '#fecaca', paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 13, color: '#dc2626', flex: 1, fontWeight: '600' }}>{formError}</Text>
              <TouchableOpacity onPress={() => setFormError(null)}>
                <X size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          )}

          <ScrollView className="p-5" contentContainerStyle={{ paddingBottom: 100 }}>
            
            <View className="items-center mb-8">
              {form.photo ? (
                (() => {
                  const API_ORIGIN = API_URL.replace('/api', '');
                  const photoUri = form.photo.startsWith('http')
                    ? form.photo
                    : `${API_ORIGIN}${form.photo.startsWith('/') ? '' : '/'}${form.photo}`;
                  return (
                    <Image
                      source={{ uri: photoUri, headers: { Authorization: `Bearer ${token}` } }}
                      className="w-28 h-28 rounded-full border-4 border-white shadow-sm"
                    />
                  );
                })()
              ) : (
                <View className="w-28 h-28 rounded-full bg-indigo-50 items-center justify-center border-4 border-white shadow-sm">
                  <User size={40} color="#818cf8" />
                </View>
              )}
              <TouchableOpacity onPress={handlePhotoUpload} className="mt-4 bg-white px-5 py-2.5 rounded-full shadow-sm border border-gray-200">
                <Text className="text-indigo-600 font-bold text-sm">Fotoğraf Seç</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mb-6">
              <Text className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">Temel Bilgiler</Text>
              
              <Text className="text-sm font-bold text-gray-700 mb-1.5">Ad Soyad *</Text>
              <TextInput value={form.name} onChangeText={t => setForm({...form, name: t})} className="bg-[#f8fafc] border border-gray-200 rounded-2xl px-4 py-3.5 mb-5 text-gray-900 font-medium" />
              
              <Text className="text-sm font-bold text-gray-700 mb-1.5">E-posta *</Text>
              <TextInput value={form.email} onChangeText={t => setForm({...form, email: t})} autoCapitalize="none" keyboardType="email-address" className="bg-[#f8fafc] border border-gray-200 rounded-2xl px-4 py-3.5 mb-5 text-gray-900 font-medium" />
              
              <Text className="text-sm font-bold text-gray-700 mb-1.5">Telefon *</Text>
              <TextInput value={form.phone} onChangeText={t => setForm({...form, phone: t})} keyboardType="phone-pad" className="bg-[#f8fafc] border border-gray-200 rounded-2xl px-4 py-3.5 mb-5 text-gray-900 font-medium" />
              
              {!editingPatient && (
                <>
                  <Text className="text-sm font-bold text-gray-700 mb-1.5">Şifre <Text className="font-normal text-gray-400">(Boşsa otomatik oluşturulur)</Text></Text>
                  <TextInput value={form.password} onChangeText={t => setForm({...form, password: t})} secureTextEntry className="bg-[#f8fafc] border border-gray-200 rounded-2xl px-4 py-3.5 mb-2 text-gray-900 font-medium" />
                </>
              )}
            </View>

            <View className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mb-6">
              <Text className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">Klinik Profili</Text>
              
              <Text className="text-sm font-bold text-gray-700 mb-1.5">Sorumlu (Fizyoterapist)</Text>
              <View className="mb-5 flex-row flex-wrap gap-2">
                <TouchableOpacity 
                  onPress={() => isAdmin && setForm({...form, responsibleAdminId: ""})}
                  disabled={!isAdmin}
                  className={`px-4 py-2 rounded-full border ${form.responsibleAdminId === "" ? 'bg-indigo-600 border-indigo-600' : 'bg-[#f8fafc] border-gray-200'}`}
                >
                  <Text style={{ color: form.responsibleAdminId === "" ? '#fff' : '#6b7280', fontWeight: '600', fontSize: 13 }}>Atanmamış</Text>
                </TouchableOpacity>
                {admins.map(admin => (
                  <TouchableOpacity 
                    key={admin.id}
                    onPress={() => isAdmin && setForm({...form, responsibleAdminId: admin.id})}
                    disabled={!isAdmin}
                    className={`px-4 py-2 rounded-full border ${form.responsibleAdminId === admin.id ? 'bg-indigo-600 border-indigo-600' : 'bg-[#f8fafc] border-gray-200'}`}
                  >
                    <Text style={{ color: form.responsibleAdminId === admin.id ? '#fff' : '#4b5563', fontWeight: '600', fontSize: 13 }}>{admin.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row gap-4 mb-5">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-700 mb-1.5">Cinsiyet</Text>
                  <TextInput value={form.gender} onChangeText={t => setForm({...form, gender: t})} placeholder="Erkek/Kadın" className="bg-[#f8fafc] border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 font-medium" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-700 mb-1.5">Yaş</Text>
                  <TextInput value={form.age} onChangeText={t => setForm({...form, age: t})} keyboardType="numeric" placeholder="Örn: 35" className="bg-[#f8fafc] border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 font-medium" />
                </View>
              </View>

              <Text className="text-sm font-bold text-gray-700 mb-1.5">Hastalık (Kısa Tanıtım)</Text>
              <TextInput value={form.shortDescription} onChangeText={t => setForm({...form, shortDescription: t})} placeholder="Örn: Bel Fıtığı" className="bg-[#f8fafc] border border-gray-200 rounded-2xl px-4 py-3.5 mb-5 text-gray-900 font-medium" />
              
              <Text className="text-sm font-bold text-gray-700 mb-1.5">Kapsamlı Detaylar</Text>
              <TextInput value={form.longDetails} onChangeText={t => setForm({...form, longDetails: t})} placeholder="Öykü, önceki değerlendirmeler..." multiline numberOfLines={4} className="bg-[#f8fafc] border border-gray-200 rounded-2xl px-4 py-4 mb-5 text-gray-900 font-medium h-24" style={{ textAlignVertical: 'top' }} />

              <Text className="text-sm font-bold text-gray-700 mb-1.5">Klinik Görüş</Text>
              <TextInput value={form.clinicalOpinion} onChangeText={t => setForm({...form, clinicalOpinion: t})} placeholder="Klinik görüşünüz ve notlarınız..." multiline numberOfLines={4} className="bg-[#f8fafc] border border-gray-200 rounded-2xl px-4 py-4 mb-2 text-gray-900 font-medium h-24" style={{ textAlignVertical: 'top' }} />
            </View>

            <TouchableOpacity 
              onPress={savePatient} 
              disabled={formLoading || !form.name} 
              className={`rounded-2xl py-4 items-center mt-2 flex-row justify-center ${(!form.name) ? 'bg-indigo-300' : 'bg-indigo-600'}`}
            >
              {formLoading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text className="text-white font-black text-lg mr-2">Profili Kaydet</Text>
                  <ChevronRight size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* SMS MODAL */}
      <Modal visible={!!smsTarget} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <View className="w-12 h-12 bg-teal-100 rounded-full items-center justify-center mb-4">
              <MessageCircle size={24} color="#0f766e" />
            </View>
            <Text className="text-xl font-black text-gray-900 mb-2">SMS Gönder</Text>
            <Text className="text-sm font-medium text-gray-500 mb-6">{smsTarget?.name} adlı hastaya giriş bilgilerini içeren bir hatırlatma mesajı atılacaktır.</Text>
            
            <Text className="text-xs font-bold text-gray-700 mb-1">Telefon</Text>
            <TextInput value={smsPhone} onChangeText={setSmsPhone} placeholder="5XX XXX XX XX" keyboardType="phone-pad" className="bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-3.5 mb-4 text-gray-900 font-medium" />
            
            <Text className="text-xs font-bold text-gray-700 mb-1">Şifre</Text>
            <TextInput value={smsPassword} onChangeText={setSmsPassword} placeholder="Şifre bilgisi" className="bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-3.5 mb-6 text-gray-900 font-medium" />
            
            <View className="flex-row justify-end space-x-3">
              <TouchableOpacity onPress={() => setSmsTarget(null)} className="px-5 py-3 rounded-xl bg-gray-100 flex-1 items-center">
                <Text className="text-gray-700 font-bold">İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={sendSms} disabled={smsLoading} className="bg-teal-600 px-5 py-3 rounded-xl flex-1 items-center">
                {smsLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white font-bold">Gönder</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* RIGHTS MODAL */}
      <Modal visible={!!rightsTarget} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mb-4">
              <Users size={24} color="#7e22ce" />
            </View>
            <Text className="text-xl font-black text-gray-900 mb-1">Soru Hakkı Düzenle</Text>
            <Text className="text-sm font-medium text-gray-500 mb-4">{rightsTarget?.name}</Text>

            {/* Current stats */}
            <View className="flex-row justify-between bg-purple-50 rounded-2xl p-4 mb-5">
              <View className="items-center">
                <Text className="text-xs text-gray-400 mb-1">Mevcut Limit</Text>
                <Text className="text-lg font-black text-gray-800">{rightsTarget?.usageLimit ?? 0}</Text>
              </View>
              <View className="items-center">
                <Text className="text-xs text-gray-400 mb-1">Kullanılan</Text>
                <Text className="text-lg font-black text-gray-800">{rightsTarget?.usageUsed ?? 0}</Text>
              </View>
              <View className="items-center">
                <Text className="text-xs text-gray-400 mb-1">Kalan</Text>
                <Text className="text-lg font-black text-purple-700">{Math.max(0, (rightsTarget?.usageLimit ?? 0) - (rightsTarget?.usageUsed ?? 0))}</Text>
              </View>
            </View>

            <Text className="text-xs font-bold text-gray-700 mb-2">Miktar</Text>
            <TextInput
              value={rightsAmount}
              onChangeText={setRightsAmount}
              keyboardType="numeric"
              className="bg-[#f8fafc] border border-purple-200 rounded-xl px-4 py-4 mb-5 text-purple-700 font-black text-2xl text-center"
            />

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <TouchableOpacity
                onPress={() => saveRights('add')}
                disabled={rightsLoading}
                style={{ flex: 1, backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}
              >
                {rightsLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>+ Hak Ekle</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => saveRights('subtract')}
                disabled={rightsLoading}
                style={{ flex: 1, backgroundColor: '#fee2e2', borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}
              >
                {rightsLoading
                  ? <ActivityIndicator color="#dc2626" size="small" />
                  : <Text style={{ color: '#dc2626', fontWeight: '800', fontSize: 14 }}>− Hak Düşür</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setRightsTarget(null)} className="items-center py-3">
              <Text className="text-gray-400 font-medium text-sm">İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
}
