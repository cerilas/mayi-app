const fs = require('fs');
const file = 'src/app/(tabs)/settings.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Toast import
c = c.replace(/import \{ View, Text/g, "import Toast from 'react-native-toast-message';\nimport { View, Text");

// 2. Alert -> Toast
c = c.replace(/Alert\.alert\("Başarılı", (.*?)\);/g, "Toast.show({ type: 'success', text1: 'Başarılı', text2: $1 });");
c = c.replace(/Alert\.alert\("Hata", (.*?)\);/g, "Toast.show({ type: 'error', text1: 'Hata', text2: $1 });");

// 3. SMS functionality with newPassword
c = c.replace(
  `  const [userForm, setUserForm] = useState({ id: '', name: '', email: '', password: '', role: 'user' });`,
  `  const [userForm, setUserForm] = useState({ id: '', name: '', email: '', password: '', role: 'user' });\n\n  const [showSmsModal, setShowSmsModal] = useState(false);\n  const [smsForm, setSmsForm] = useState({ userId: '', phone: '', newPassword: '' });\n  const [smsSubmitting, setSmsSubmitting] = useState(false);`
);

const oldSendSms = `  const sendSms = async (id: string) => {
    Alert.prompt(
      "SMS Gönder", 
      "Kullanıcının telefon numarasını (başında 0 olmadan 10 hane) girin:",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Gönder", 
          onPress: async (phone?: string) => {
            if (!phone) return;
            try {
              await axios.post(\`\${API_URL}/admin/sms\`, { userId: id, phone }, { headers });
              Toast.show({ type: 'success', text1: 'Başarılı', text2: "SMS başarıyla gönderildi." });
            } catch (err: any) {
              Toast.show({ type: 'error', text1: 'Hata', text2: err.response?.data?.error || "Gönderilemedi" });
            }
          }
        }
      ],
      "plain-text"
    );
  };`;

const newSendSms = `  const sendSms = (id: string) => {
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
      await axios.post(\`\${API_URL}/admin/sms\`, smsForm, { headers });
      Toast.show({ type: 'success', text1: 'Başarılı', text2: "SMS başarıyla gönderildi." });
      setShowSmsModal(false);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Hata', text2: err.response?.data?.error || "Gönderilemedi" });
    } finally {
      setSmsSubmitting(false);
    }
  };`;
c = c.replace(oldSendSms, newSendSms);
if (!c.includes("handleSendSms")) {
  c = c.replace(/  const sendSms = async \(id: string\) => \{[\s\S]*?  \};/, newSendSms);
}

// 4. Skeletons for fetching states
c = c.replace(/  const fetchUsage = useCallback\(async \(\) => \{/g, "  const [isFetchingUsage, setIsFetchingUsage] = useState(false);\n  const fetchUsage = useCallback(async () => {\n    setIsFetchingUsage(true);");
c = c.replace(/      setUsageData\(res\.data\);\n    \} catch \(err\) \{\}\n  \}, \[\]\);/g, "      setUsageData(res.data);\n    } catch (err) {} finally { setIsFetchingUsage(false); }\n  }, []);");

c = c.replace(/  const fetchInstructions = useCallback\(async \(\) => \{/g, "  const [isFetchingInst, setIsFetchingInst] = useState(false);\n  const fetchInstructions = useCallback(async () => {\n    setIsFetchingInst(true);");
c = c.replace(/        base: res\.data\.base_instruction \|\| ''\n      \}\);\n    \} catch \(err\) \{\}\n  \}, \[\]\);/g, "        base: res.data.base_instruction || ''\n      });\n    } catch (err) {} finally { setIsFetchingInst(false); }\n  }, []);");

c = c.replace(/  const fetchGeneral = useCallback\(async \(\) => \{/g, "  const [isFetchingGen, setIsFetchingGen] = useState(false);\n  const fetchGeneral = useCallback(async () => {\n    setIsFetchingGen(true);");
c = c.replace(/      if \(modelsRes\.data\.gemini\) setAvailableModels\(modelsRes\.data\.gemini\);\n    \} catch \(err\) \{\}\n  \}, \[\]\);/g, "      if (modelsRes.data.gemini) setAvailableModels(modelsRes.data.gemini);\n    } catch (err) {} finally { setIsFetchingGen(false); }\n  }, []);");

// 5. Replace render blocks for skeletons
const usageRenderOld = `{usageData && (
              <View className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">`;
const usageRenderNew = `{isFetchingUsage ? (
              <View className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <View className="flex-row justify-between mb-4">
                  <Skeleton width={80} height={14} />
                  <Skeleton width={60} height={14} />
                </View>
                <Skeleton width="100%" height={12} borderRadius={6} className="mb-2" />
                <Skeleton width={100} height={10} />
              </View>
            ) : usageData && (
              <View className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">`;
c = c.replace(usageRenderOld, usageRenderNew);

const instRenderOld = `<Text className="text-xs font-bold text-gray-700 mb-2">Temel Talimat (Base Instruction)</Text>
              <TextInput multiline value={instructions.base}`;
const instRenderNew = `{isFetchingInst ? (
                <View className="space-y-4 mb-4">
                  <Skeleton width={120} height={14} className="mb-2" />
                  <Skeleton width="100%" height={96} borderRadius={12} className="mb-4" />
                  <Skeleton width={120} height={14} className="mb-2" />
                  <Skeleton width="100%" height={128} borderRadius={12} className="mb-4" />
                </View>
              ) : (
                <>
                  <Text className="text-xs font-bold text-gray-700 mb-2">Temel Talimat (Base Instruction)</Text>
                  <TextInput multiline value={instructions.base}`;
c = c.replace(instRenderOld, instRenderNew);
// close the frag for instRenderNew
c = c.replace(/\{instLoading \? <ActivityIndicator color="#fff" \/> : <Text className="text-white font-bold text-sm">Talimatları Kaydet<\/Text>\}[\s\S]*?<\/TouchableOpacity>/, `$&
                </>
              )`);

const genRenderOld = `<Text className="text-xs font-bold text-gray-700 mb-2">Gemini API Anahtarı</Text>
              <View className="flex-row mb-6">`;
const genRenderNew = `{isFetchingGen ? (
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
                  <View className="flex-row mb-6">`;
c = c.replace(genRenderOld, genRenderNew);
c = c.replace(/<Text className="text-white font-bold text-sm">Modeli Kaydet<\/Text>[\s\S]*?<\/TouchableOpacity>/, `$&
                </>
              )`);

// 6. SMS Modal UI
const modalStr = `      {/* User Modal */}
      <Modal visible={showUserModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white rounded-3xl p-6 shadow-xl">
            <Text className="text-lg font-black text-gray-900 mb-4">{userForm.id ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</Text>
            
            <TextInput value={userForm.name} onChangeText={v => setUserForm({...userForm, name: v})} placeholder="Ad Soyad" className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 text-sm" />
            <TextInput value={userForm.email} onChangeText={v => setUserForm({...userForm, email: v})} placeholder="E-posta" keyboardType="email-address" autoCapitalize="none" className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 text-sm" />
            <TextInput value={userForm.password} onChangeText={v => setUserForm({...userForm, password: v})} placeholder={userForm.id ? "Şifre (Değiştirmek istemiyorsanız boş bırakın)" : "Şifre"} secureTextEntry className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 text-sm" />
            
            <View className="flex-row gap-2 mb-6">
              {['user', 'physiotherapist', 'admin'].map(r => (
                <TouchableOpacity key={r} onPress={() => setUserForm({...userForm, role: r})} className={\`flex-1 py-2 rounded-lg border items-center \${userForm.role === r ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-200'}\`}>
                  <Text className={\`text-[10px] font-bold uppercase \${userForm.role === r ? 'text-indigo-700' : 'text-gray-500'}\`}>{r === 'user' ? 'Hasta' : r === 'physiotherapist' ? 'Fizyo' : 'Admin'}</Text>
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
      </Modal>`;

c = c.replace(/      \{\/\* User Modal \*\/\}[\s\S]*?<\/Modal>/, modalStr);

fs.writeFileSync(file, c, 'utf8');
