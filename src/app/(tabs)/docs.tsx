import React, { useState, useMemo } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, Platform, LayoutAnimation, UIManager } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Search, ChevronDown, Copy, User, ShieldCheck, CheckCircle2, ChevronRight, X } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { AppHeader } from '../../components/app-header';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../context/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type GuideRole = "physiotherapist" | "admin";

type GuideSection = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  audience: "all" | GuideRole;
  duration: string;
  steps?: { title: string; detail: string }[];
  items?: { title: string; detail: string; badge?: string }[];
  note?: { tone: "info" | "warning" | "success"; title: string; text: string };
  prompt?: string;
  actions?: { label: string; primary?: boolean }[];
  keywords: string[];
};

const ROLE_META: Record<GuideRole, { label: string; description: string; icon: any }> = {
  physiotherapist: {
    label: "Fizyoterapist",
    description: "Klinik çalışma, atanmış hastalar ve yapay zekâ",
    icon: User
  },
  admin: {
    label: "Admin",
    description: "Klinik yönetimi, kullanıcılar, sms ve rapor",
    icon: ShieldCheck
  },
};

const SECTIONS: GuideSection[] = [
  {
    id: "baslangic", eyebrow: "Hızlı başlangıç", title: "İlk 10 dakikada sistemi hazırlayın",
    description: "Hesabınızı kişiselleştirin, ilk sohbetinizi açın ve çalışma alanınızı düzenleyin.",
    icon: "01", audience: "all", duration: "4 adım",
    steps: [
      { title: "Ayarlarınızı kontrol edin", detail: "Ayarlar simgesini açın. Açık/koyu görünüm, renk ve yapay zekâ talimatlarınızı belirleyin." },
      { title: "Yeni bir sohbet başlatın", detail: "Yeni sohbet oluşturun ve talebinizi amaç, bağlam, beklenen çıktı ile yazın." },
      { title: "Doğru aracı seçin", detail: "Web Araması, Görsel Üret veya Dosya Yükle araçlarını ihtiyacınıza göre seçin." },
      { title: "Sohbetleri düzenleyin", detail: "Sık kullandığınız konuşmaları yeniden adlandırın, klasörlere taşıyın." },
    ],
    keywords: ["başlangıç", "ayarlar", "tema", "ilk sohbet", "klasör", "yeni sohbet"],
  },
  {
    id: "sohbet", eyebrow: "Ortak kullanım", title: "Yapay zekâ sohbetini etkili kullanın",
    description: "Daha güvenilir yanıtlar almak için sohbet araçlarını doğru amaçla ve doğru sırada kullanın.",
    icon: "02", audience: "all", duration: "6 özellik",
    items: [
      { title: "Net bir istek yazın", detail: "Hastanın kişisel verilerini paylaşmadan hedefi, bağlamı ve istediğiniz formatı belirtin.", badge: "Önerilen" },
      { title: "Dosya ve görsel ekleyin", detail: "PDF, JPG, PNG dosyalarını yükleyebilirsiniz. Dosyanın hangi bölümüyle ilgili değerlendirme istediğinizi belirtin." },
      { title: "Web Araması", detail: "Güncel kılavuz, çalışma veya duyuru ararken kullanın." },
      { title: "Görsel üretin", detail: "Egzersiz anlatımı gibi görseller için pozisyonu ve sade arka plan beklentinizi tarif edin." },
      { title: "Yanıt işlemleri", detail: "Asistan yanıtını sesli dinleyebilir, uzun metni genişletebilirsiniz." },
      { title: "Sohbeti paylaşın", detail: "Paylaş özelliği açıkken oluşan bağlantıyı yetkili kişilerle paylaşın.", badge: "Dikkat" },
    ],
    note: { tone: "info", title: "İyi komut formülü", text: "Amaç + gerekli bağlam + istediğiniz çıktı biçimi + sınırlar. Örnek: “Aşağıdaki notları hastaya uygun ev egzersizi hatırlatmasına dönüştür; tanı ekleme.”" },
    keywords: ["chat", "sohbet", "dosya", "pdf", "görsel", "web arama", "paylaş", "sesli oku"],
  },
  {
    id: "gunluk-akis", eyebrow: "Fizyoterapist", title: "Günlük klinik çalışma akışı",
    description: "Atanmış hastalarınızı gözden geçirin, klinik bağlamı güncelleyin ve takip iletişimini hazırlayın.",
    icon: "03", audience: "physiotherapist", duration: "5 adım",
    steps: [
      { title: "Hasta listenizi açın", detail: "Hastalarım ekranında yalnızca sorumluluğunuzdaki kayıtlar gösterilir." },
      { title: "Klinik bilgileri doğrulayın", detail: "Yeni seansta hastanın 'Profil' detaylarına girip klinik görüşünüzü güncelleyin." },
      { title: "Sohbet bağlamını ayarlayın", detail: "Sohbet başlatırken '+' menüsünden hastanızı seçerek yapay zekanın hastayı tanımasını sağlayın." },
      { title: "Egzersiz planı üretin", detail: "Hastanın sınırlarına uygun 3-5 maddelik program isteyin." },
      { title: "SMS ile iletin", detail: "Yapay zekanın yanıtını hastaya özel SMS olarak gönderin." },
    ],
    note: { tone: "success", title: "Yetki sınırı", text: "Fizyoterapist yalnızca kendi hastalarını görebilir. Yeni hasta oluşturma/silme admin tarafından yapılır." },
    keywords: ["fizyoterapist", "atanmış hasta", "günlük", "klinik", "takip", "sorumlu"],
  },
  {
    id: "hasta-kaydi", eyebrow: "Fizyoterapist", title: "Hasta bağlamını doğru tutun",
    description: "Hasta profilindeki alanlar, yapay zekâ yanıtlarının kişiselleştirilmesinde kullanılır.",
    icon: "04", audience: "physiotherapist", duration: "4 alan",
    items: [
      { title: "Kısa tanıtım", detail: "Başvuru nedeni, etkilenen bölge ve bakım hedefi." },
      { title: "Uzun detaylar", detail: "Öykü, önceki değerlendirmeler, günlük yaşam etkisi." },
      { title: "Klinik görüş", detail: "Sizin değerlendirmeniz, kısıtlar ve dikkat edilecekler.", badge: "Kritik alan" },
      { title: "Egzersiz videoları", detail: "YouTube bağlantılarını ekleyin." },
    ],
    note: { tone: "warning", title: "Kayıt standardı", text: "İyi/kötü gibi belirsiz ifadeler yerine gözlenebilir bilgi kullanın." },
    keywords: ["hasta profili", "klinik görüş", "uzun detay", "video", "youtube", "bağlam"],
  },
  {
    id: "klinik-komutlar", eyebrow: "Fizyoterapist", title: "Örnek komut şablonu",
    description: "Şablonu kopyalayın, köşeli parantezleri kendi ihtiyacınıza göre düzenleyin.",
    icon: "05", audience: "physiotherapist", duration: "Kopyalanabilir",
    prompt: "Rolün: Fizyoterapist asistanı.\nAmaç: [seans özeti] hazırla.\nBağlam: [klinik bilgiler]\nHedef kitle: [hasta]\nÇıktı: [format]\nSınırlar: Yeni tanı koyma.",
    note: { tone: "info", title: "Web araması", text: "Asistan özetini orijinal kaynağın yerine kullanmayın." },
    keywords: ["prompt", "komut", "şablon", "seans özeti", "literatür", "hasta bilgilendirme"],
  },
  {
    id: "admin-hasta", eyebrow: "Admin", title: "Hasta hesaplarını yönetin",
    description: "Tekil veya toplu hasta oluşturun, sorumlu atayın, erişim bilgilerini yönetin.",
    icon: "03", audience: "admin", duration: "6 işlem",
    items: [
      { title: "Yeni hasta oluşturma", detail: "Ad, e-posta girin ve güçlü bir başlangıç parolası belirleyin." },
      { title: "Sorumlu atama", detail: "Hastayı ilgili fizyoterapiste atayın.", badge: "Yetki" },
      { title: "Toplu içe aktarma", detail: "Excel ile hastaları ekleyin." },
      { title: "Dışa aktarma", detail: "Hasta verilerini Excel olarak indirin." },
      { title: "Parola ve SMS", detail: "Yeni parola üretip SMS ile hastaya iletin." },
      { title: "Kayıt silme", detail: "Kimlik doğrulaması sonrası kullanın.", badge: "Geri alınamaz" },
    ],
    keywords: ["admin", "hasta ekle", "excel", "içe aktar", "dışa aktar", "sil", "sms", "parola"],
  },
  {
    id: "admin-sistem", eyebrow: "Admin", title: "Sistem ve ayarları yönetin",
    description: "Rolleri, yapay zekâ davranışını ve klinik genelindeki varsayılanları değiştirin.",
    icon: "04", audience: "admin", duration: "5 kontrol",
    steps: [
      { title: "Kullanıcı yönetimi", detail: "Kullanıcı oluşturun, admin veya fizyoterapist yetkisi verin." },
      { title: "Kişisel talimatlar", detail: "Kişisel yapay zeka talimatlarını sistem geneli ile karıştırmayın." },
      { title: "Genel hasta talimatı", detail: "Tüm hastaları etkiler. Kısa ve net kurallar yazın." },
      { title: "Hasta modeli", detail: "Tüm hastalar için varsayılan yapay zeka modelini seçin." },
      { title: "Entegrasyon ayarları", detail: "API anahtarı ve SMS başlığını yapılandırın." },
    ],
    note: { tone: "warning", title: "Değişiklik yönetimi", text: "Genel değişiklikleri önce test edin." },
    keywords: ["kullanıcı", "rol", "model", "api", "anahtar", "talimat", "genel hasta", "ayar"],
  },
  {
    id: "admin-rapor", eyebrow: "Admin", title: "İstatistikleri izleyin",
    description: "Kullanıcı, mesaj, model ve tüketim verilerini takip edin.",
    icon: "05", audience: "admin", duration: "3 kontrol",
    items: [
      { title: "Dönemi doğru seçin", detail: "Karşılaştırma yaparken aynı tarih aralığını kullanın." },
      { title: "Kullanımı yorumlayın", detail: "Maliyet artışında model değişikliğini değerlendirin." },
      { title: "Rapor alıcıları", detail: "Günlük raporları yalnızca yetkililere gönderin.", badge: "Gizlilik" },
    ],
    keywords: ["istatistik", "rapor", "analiz", "mesaj sayısı", "tüketim", "maliyet"],
  }
];

function Accordion({ section }: { section: GuideSection }) {
  const { colors: C } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };

  const copyPrompt = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Toast.show({ type: 'success', text1: 'Şablon Kopyalandı' });
  };

  return (
    <View style={{ marginBottom: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden' }}>
      <TouchableOpacity onPress={toggle} style={{ flexDirection: 'row', padding: 16, alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#9ca3af' }}>{section.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.brand, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            {section.eyebrow}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
            {section.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>{section.duration}</Text>
          </View>
        </View>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isOpen ? '#f3f4f6' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronDown size={20} color="#9ca3af" style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View style={{ padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
          <Text style={{ fontSize: 13, color: '#4b5563', lineHeight: 20, marginTop: 16, marginBottom: 16 }}>
            {section.description}
          </Text>

          {section.steps && (
            <View style={{ gap: 16 }}>
              {section.steps.map((step, idx) => (
                <View key={idx} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 }}>{step.title}</Text>
                    <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 20 }}>{step.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {section.items && (
            <View style={{ gap: 12 }}>
              {section.items.map((item, idx) => (
                <View key={idx} style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f3f4f6' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{item.title}</Text>
                    {item.badge && (
                      <View style={{ backgroundColor: `${C.brand}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ color: C.brand, fontSize: 10, fontWeight: '700' }}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 20 }}>{item.detail}</Text>
                </View>
              ))}
            </View>
          )}

          {section.prompt && (
            <View style={{ marginTop: 16, backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Komut Şablonu</Text>
                <TouchableOpacity onPress={() => copyPrompt(section.prompt!)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <Copy size={12} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Kopyala</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: '#e2e8f0', fontSize: 12, lineHeight: 20, padding: 16 }}>{section.prompt}</Text>
            </View>
          )}

          {section.note && (
            <View style={{
              marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1,
              backgroundColor: section.note.tone === 'warning' ? '#fffbeb' : section.note.tone === 'success' ? '#f0fdf4' : `${C.brand}10`,
              borderColor: section.note.tone === 'warning' ? '#f59e0b' : section.note.tone === 'success' ? '#22c55e' : C.brand
            }}>
              <Text style={{
                fontSize: 12, fontWeight: '700', marginBottom: 4,
                color: section.note.tone === 'warning' ? '#b45309' : section.note.tone === 'success' ? '#15803d' : C.brand
              }}>
                {section.note.title}
              </Text>
              <Text style={{ fontSize: 13, color: '#4b5563', lineHeight: 20 }}>
                {section.note.text}
              </Text>
            </View>
          )}

        </View>
      )}
    </View>
  );
}

export default function DocsScreen() {
  const { user } = useAuthStore();
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();
  
  const initialRole = (user?.role as GuideRole) === 'admin' ? 'admin' : 'physiotherapist';
  const [activeRole, setActiveRole] = useState<GuideRole>(initialRole);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = useMemo(() => {
    return SECTIONS.filter(section => {
      const matchAudience = section.audience === 'all' || section.audience === activeRole;
      if (!matchAudience) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const inTitle = section.title.toLowerCase().includes(q);
      const inDesc = section.description.toLowerCase().includes(q);
      const inKeywords = section.keywords.some(k => k.toLowerCase().includes(q));
      return inTitle || inDesc || inKeywords;
    });
  }, [activeRole, searchQuery]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#07090f' }}>
      <AppHeader />
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        
        <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${C.brand}15`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <BookOpen size={20} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Rehber & Kılavuz</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Platformu en verimli şekilde kullanın.</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, height: 44 }}>
            <Search size={18} color="#9ca3af" />
            <TextInput
              style={{ flex: 1, paddingHorizontal: 10, fontSize: 14, color: '#111827', height: '100%' }}
              placeholder="Kılavuzda arayın..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <X size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}>
          
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            {Object.entries(ROLE_META).map(([role, meta]) => {
              const isActive = activeRole === role;
              const Icon = meta.icon;
              return (
                <TouchableOpacity
                  key={role}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setActiveRole(role as GuideRole);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: isActive ? '#fff' : '#f3f4f6',
                    borderWidth: 2,
                    borderColor: isActive ? C.brand : 'transparent',
                    borderRadius: 16,
                    padding: 12,
                    shadowColor: isActive ? C.brand : '#000',
                    shadowOpacity: isActive ? 0.15 : 0,
                    shadowOffset: { width: 0, height: 4 },
                    shadowRadius: 8,
                    elevation: isActive ? 4 : 0,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Icon size={16} color={isActive ? C.brand : '#6b7280'} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? C.brand : '#4b5563' }}>{meta.label}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#6b7280', lineHeight: 16 }}>{meta.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredSections.length > 0 ? (
            filteredSections.map(section => (
              <Accordion key={section.id} section={section} />
            ))
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Search size={28} color="#9ca3af" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Sonuç bulunamadı</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>Arama kriterlerinizi değiştirip tekrar deneyin.</Text>
            </View>
          )}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
