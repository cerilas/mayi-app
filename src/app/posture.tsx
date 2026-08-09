import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, AlertTriangle, Info, Activity } from 'lucide-react-native';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import Svg, { Circle } from 'react-native-svg';

const API_URL = 'https://my.cerilas.com/api';

interface Measurement {
  id: string;
  metricKey: string;
  value: number;
  unit: string;
  quality: string;
}

interface TestResult {
  id: string;
  testType: string;
  overallQuality: string;
  avgConfidence: number;
  measurements: Measurement[];
}

interface Session {
  id: string;
  deviceInfo: string;
  createdAt: string;
  testResults: TestResult[];
}

interface Insight {
  title: string;
  description: string;
  riskScore: number;
  color: 'red' | 'orange' | 'yellow' | 'green';
}

export default function PostureScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await axios.get(`${API_URL}/posture/sessions?userId=${userId}`, { headers });
        setSessions(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Veriler alınamadı');
      } finally {
        setLoading(false);
      }
    }
    
    if (userId) fetchSessions();
  }, [userId]);

  const formatTestType = (type: string) => {
    const map: Record<string, string> = {
      "front_static_posture": "Ön Postür Analizi",
      "side_static_posture": "Yan Postür Analizi",
      "squat_5_reps": "Squat Analizi (5 Tekrar)",
      "shoulder_flexion": "Omuz Fleksiyonu",
      "shoulder_abduction": "Omuz Abdüksiyonu"
    };
    return map[type] || type;
  };

  const formatQuality = (quality: string) => {
    const q = quality.toLowerCase();
    if (q === 'high' || q === 'excellent') return { text: 'Mükemmel', bg: 'bg-green-100', textCol: 'text-green-700', border: 'border-green-200' };
    if (q === 'good') return { text: 'İyi', bg: 'bg-blue-100', textCol: 'text-blue-700', border: 'border-blue-200' };
    if (q === 'acceptable') return { text: 'Kabul Edilebilir', bg: 'bg-yellow-100', textCol: 'text-yellow-700', border: 'border-yellow-200' };
    if (q === 'low' || q === 'poor') return { text: 'Düşük Kalite', bg: 'bg-orange-100', textCol: 'text-orange-700', border: 'border-orange-200' };
    if (q === 'invalid') return { text: 'Geçersiz', bg: 'bg-red-100', textCol: 'text-red-700', border: 'border-red-200' };
    return { text: quality, bg: 'bg-gray-100', textCol: 'text-gray-700', border: 'border-gray-200' };
  };

  const formatMetricName = (key: string) => {
    const map: Record<string, string> = {
      "shoulderLevelAngle": "Omuz Denge Açısı",
      "pelvicLevelAngle": "Kalça (Pelvis) Denge Açısı",
      "trunkLateralLean": "Gövde Yana Eğilim",
      "forwardHeadAngle": "İleri Baş Açısı (FHP)",
      "sagittalTrunkLean": "Gövde Öne Eğilim",
      "completedRepetitions": "Tamamlanan Tekrar",
      "maxLeftKneeFlexion": "Maks. Sol Diz Fleksiyonu",
      "maxRightKneeFlexion": "Maks. Sağ Diz Fleksiyonu",
      "maxTrunkShift": "Gövde Yanal Kayması",
      "leftShoulderROM": "Sol Omuz ROM",
      "rightShoulderROM": "Sağ Omuz ROM",
      "difference": "Sağ/Sol Farkı"
    };
    return map[key] || key;
  };

  const generateInsights = (session: Session): Insight[] => {
    const insights: Insight[] = [];
    let shoulderLevel = 0; 
    let hipLevel = 0;
    let fhp = 0;
    let trunkLean = 0;
    let leftRom = 0;  
    let rightRom = 0; 
    let squatReps = -1; 
    let leftKneeFlex = 0;
    let rightKneeFlex = 0;
    let trunkShiftFront = 0;
    let trunkShiftSquat = 0;
    let hasSquatData = false;
    let hasRomData = false;

    session.testResults.forEach(test => {
      test.measurements.forEach(m => {
        if (m.metricKey === "shoulderLevelAngle") shoulderLevel = Math.abs(m.value);
        if (m.metricKey === "pelvicLevelAngle") hipLevel = Math.abs(m.value);
        if (m.metricKey === "forwardHeadAngle") fhp = Math.abs(m.value);
        if (m.metricKey === "sagittalTrunkLean") trunkLean = Math.abs(m.value);
        
        if (m.metricKey === "leftShoulderROM") { leftRom = m.value; hasRomData = true; }
        if (m.metricKey === "rightShoulderROM") { rightRom = m.value; hasRomData = true; }

        if (m.metricKey === "completedRepetitions") { squatReps = m.value; hasSquatData = true; }
        if (m.metricKey === "maxLeftKneeFlexion") { leftKneeFlex = m.value; hasSquatData = true; }
        if (m.metricKey === "maxRightKneeFlexion") { rightKneeFlex = m.value; hasSquatData = true; }
        
        if (m.metricKey === "trunkLateralLean") trunkShiftFront = Math.abs(m.value);
        if (m.metricKey === "maxTrunkShift") trunkShiftSquat = m.value;
      });
    });

    const minRom = hasRomData ? Math.min(leftRom > 0 ? leftRom : 180, rightRom > 0 ? rightRom : 180) : 180;

    // 1. Skolyoz / Asimetri Eğilimi
    let scoliosisScore = Math.max(5, Math.min(95, (shoulderLevel + hipLevel) * 8));
    insights.push({
      title: "Skolyoz / Asimetri Eğilimi",
      description: (shoulderLevel > 2 || hipLevel > 2) ? `Omuz (${shoulderLevel.toFixed(1)}°) ve kalça (${hipLevel.toFixed(1)}°) seviyelerinde asimetri tespit edildi.` : `Omuz ve kalça hizası normal sınırlarda.`,
      riskScore: Math.round(scoliosisScore),
      color: scoliosisScore > 70 ? "red" : (scoliosisScore > 30 ? "orange" : "green")
    });

    // 2. İleri Baş Postürü (Boyun Düzleşmesi)
    let fhpScore = Math.max(5, Math.min(95, (fhp - 5) * 4));
    insights.push({
      title: "İleri Baş Postürü / Boyun Düzleşmesi",
      description: fhp > 12 ? `Baş normal dikey eksenden ${fhp.toFixed(1)}° ileride duruyor.` : `Baş-boyun hizası dikey eksende sağlıklı görünüyor.`,
      riskScore: Math.round(fhpScore),
      color: fhpScore > 60 ? "red" : (fhpScore > 30 ? "orange" : "green")
    });

    // 3. Gövde Öne Eğilim (Kifoz Riski)
    let kyphosisScore = Math.max(5, Math.min(90, trunkLean * 6));
    insights.push({
      title: "Gövde Öne Eğilim (Kifoz / Kamburluk)",
      description: trunkLean > 6 ? `Gövde dikey eksenden ${trunkLean.toFixed(1)}° öne eğik pozisyonda.` : `Gövde dikliği normal sınırlarda.`,
      riskScore: Math.round(kyphosisScore),
      color: kyphosisScore > 60 ? "red" : (kyphosisScore > 30 ? "orange" : "green")
    });

    // 4. Bel Fıtığı Riski
    let herniatedDiscScore = Math.max(5, Math.min(95, (trunkShiftFront + hipLevel) * 10));
    insights.push({
      title: "Bel Fıtığı Riski (Kompansasyon)",
      description: herniatedDiscScore > 30 ? `Ağrıdan kaçınmak için gövde ağırlık merkezinin asimetrik dağıldığı tespit edildi.` : `Bel ve pelvis bölgesi dengeli yük taşıyor.`,
      riskScore: Math.round(herniatedDiscScore),
      color: herniatedDiscScore > 60 ? "red" : (herniatedDiscScore > 30 ? "orange" : "green")
    });

    // 5. Boyun Fıtığı Riski
    let cervicalScore = Math.max(5, Math.min(95, (fhp > 15 ? (fhp * 3) : 5) + (Math.abs(leftRom - rightRom) * 0.5)));
    insights.push({
      title: "Boyun Fıtığı Riski",
      description: cervicalScore > 30 ? `Şiddetli ileri baş postürü servikal sinir baskısı ve boyun fıtığı riski taşıyor.` : `Boyun ekseninde riskli bir baskı saptanmadı.`,
      riskScore: Math.round(cervicalScore),
      color: cervicalScore > 60 ? "red" : (cervicalScore > 30 ? "orange" : "green")
    });

    // 6. Menisküs / Ön Çapraz Bağ
    let kneeAsymmetry = Math.abs(leftKneeFlex - rightKneeFlex);
    let aclScore = Math.max(5, Math.min(95, kneeAsymmetry * 4));
    insights.push({
      title: "Menisküs / Çapraz Bağ Riski",
      description: kneeAsymmetry > 15 ? `Sağ ve sol dizin bükülme açıları arasında ciddi fark var.` : `Her iki dizin bükülme açısı ve yük dağılımı dengeli.`,
      riskScore: Math.round(aclScore),
      color: aclScore > 60 ? "red" : (aclScore > 30 ? "orange" : "green")
    });

    // 7. Donuk Omuz
    let frozenShoulderScore = !hasRomData ? 5 : Math.max(5, Math.min(95, (110 - minRom) * 2.2));
    insights.push({
      title: "Donuk Omuz Şüphesi",
      description: frozenShoulderScore > 40 ? `Omuz eklem açıklığı kritik seviyede (< 100°) kısıtlanmış.` : `Omuz kapsülünde ciddi bir donukluk belirtisi yok.`,
      riskScore: Math.round(frozenShoulderScore),
      color: frozenShoulderScore > 60 ? "red" : (frozenShoulderScore > 30 ? "orange" : "green")
    });

    // 8. Omuz Mobilite Kısıtlılığı
    let mobilityScore = !hasRomData ? 5 : Math.max(5, Math.min(90, (175 - minRom) * 1.2));
    insights.push({
      title: "Omuz Mobilite Kısıtlılığı",
      description: minRom < 160 ? `Omuz eklem açıklığı ideal 180°'nin altında kaldı (${minRom.toFixed(1)}°).` : `Omuz hareket açıklığı mükemmel seviyede.`,
      riskScore: Math.round(mobilityScore),
      color: mobilityScore > 60 ? "red" : (mobilityScore > 30 ? "orange" : "green")
    });

    // 9. Dizde Sıvı Kaybı / Kireçlenme
    const kneeFlex = Math.max(leftKneeFlex, rightKneeFlex);
    let oaScore = 5;
    if (hasSquatData) {
      const flexPenalty = Math.max(0, (kneeFlex - 60) * 1.2);
      const repPenalty = squatReps < 5 ? (5 - squatReps) * 8 : 0;
      oaScore = Math.max(5, Math.min(95, flexPenalty + repPenalty));
    }
    insights.push({
      title: "Dizde Sıvı Kaybı / Kireçlenme",
      description: oaScore > 40 ? `Squat derinliği ve tekrar sayısında ciddi yetersizlik mevcut.` : `Alt ekstremite gücü ve eklem aralığı sağlıklı.`,
      riskScore: Math.round(oaScore),
      color: oaScore > 60 ? "red" : (oaScore > 30 ? "orange" : "green")
    });

    // 10. Kulak Çınlaması (Servikojenik)
    let tinnitusScore = Math.max(5, Math.min(90, (fhp - 12) * 5));
    insights.push({
      title: "Kulak Çınlaması (Servikojenik)",
      description: tinnitusScore > 40 ? `Boyun kaslarındaki aşırı gerginlik ve boyun düzleşmesi çınlamayı tetikleyebilir.` : `Servikal eksende çınlamaya yol açacak gerginlik görülmüyor.`,
      riskScore: Math.round(tinnitusScore),
      color: tinnitusScore > 60 ? "red" : (tinnitusScore > 30 ? "orange" : "green")
    });

    // 11. Genel Duruş Bozukluğu
    let generalPostureScore = Math.round((scoliosisScore + fhpScore + kyphosisScore) / 3);
    insights.push({
      title: "Genel Duruş Bozukluğu",
      description: generalPostureScore > 30 ? `Birden fazla postüral sapma bir arada görülüyor.` : `Genel iskelet yapısı ve duruş formu çok sağlıklı.`,
      riskScore: generalPostureScore,
      color: generalPostureScore > 60 ? "red" : (generalPostureScore > 30 ? "orange" : "green")
    });

    // 12. Fibromiyalji (Dolaylı)
    let fibroScore = Math.max(5, Math.min(60, (generalPostureScore * 0.8)));
    insights.push({
      title: "Fibromiyalji (Dolaylı)",
      description: `Bu oran duruş bozukluğunun kronik yaygın ağrı yaratma potansiyelidir (Özel klinik test gerektirir).`,
      riskScore: Math.round(fibroScore),
      color: fibroScore > 40 ? "orange" : "green"
    });

    // 13. Tenisçi/Golfçü Dirseği (Dolaylı)
    insights.push({
      title: "Tenisçi/Golfçü Dirseği (Dolaylı)",
      description: `Dirsek ve el bileği için spesifik ROM testleri gereklidir. Omuz analizi üzerinden yansıyan risk bulunamadı.`,
      riskScore: 5,
      color: "green"
    });

    // 14. Topuk Dikeni / Pelvik Taban (Dolaylı)
    insights.push({
      title: "Topuk Dikeni / Pelvik Taban",
      description: `Ayak basış analizi ve klinik palpe testi yapılması önerilir.`,
      riskScore: 5,
      color: "green"
    });

    return insights;
  };

  const getStrokeColor = (color: string) => {
    switch (color) {
      case 'red': return '#ef4444';
      case 'orange': return '#f97316';
      case 'yellow': return '#eab308';
      case 'green': return '#22c55e';
      default: return '#22c55e';
    }
  };

  const getTextColor = (color: string) => {
    switch (color) {
      case 'red': return 'text-red-700';
      case 'orange': return 'text-orange-700';
      case 'yellow': return 'text-yellow-700';
      case 'green': return 'text-green-700';
      default: return 'text-green-700';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center p-4 bg-white border-b border-gray-100 shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="p-2 mr-3 bg-gray-50 rounded-full">
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-black text-gray-900">Postür Analizi Raporları</Text>
          <Text className="text-xs text-gray-500 font-medium">Hastanın analiz sonuçları</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text className="mt-4 text-gray-500 font-medium">Veriler yükleniyor...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center p-6">
          <AlertTriangle size={48} color="#ef4444" />
          <Text className="mt-4 text-gray-800 text-lg font-bold text-center">{error}</Text>
          <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-indigo-600 px-6 py-3 rounded-full">
            <Text className="text-white font-bold">Geri Dön</Text>
          </TouchableOpacity>
        </View>
      ) : sessions.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Info size={48} color="#94a3b8" />
          <Text className="mt-4 text-gray-800 text-lg font-bold">Henüz Rapor Yok</Text>
          <Text className="mt-2 text-gray-500 text-center">Bu hasta için kaydedilmiş bir postür analizi bulunmuyor.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
          {sessions.map((session) => (
            <View key={session.id} className="bg-white border border-gray-200 rounded-3xl overflow-hidden mb-6 shadow-sm">
              <View className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex-row justify-between items-center">
                <View>
                  <Text className="text-base font-bold text-gray-900">
                    Oturum: {new Date(session.createdAt).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-0.5 font-mono">ID: {session.id}</Text>
                </View>
              </View>
              
              {/* AI Insights Section */}
              <View className="px-5 py-5 bg-indigo-50/50 border-b border-indigo-100">
                <View className="flex-row items-center mb-4">
                  <Activity size={18} color="#4f46e5" className="mr-2" />
                  <Text className="font-bold text-indigo-900 text-sm">Genişletilmiş Yapay Zeka Risk Analizi</Text>
                </View>
                
                <View className="flex-row flex-wrap justify-between">
                  {generateInsights(session).map((insight, idx) => {
                    const radius = 18;
                    const stroke = 4;
                    const normalizedRadius = radius - stroke / 2;
                    const circumference = normalizedRadius * 2 * Math.PI;
                    const strokeDashoffset = circumference - (insight.riskScore / 100) * circumference;

                    return (
                      <View key={idx} className="w-[100%] md:w-[48%] bg-white p-4 rounded-2xl mb-3 shadow-sm border border-indigo-50 flex-row items-center">
                        <View className="mr-4 items-center justify-center relative w-[45px] h-[45px]">
                          <Svg height="45" width="45" viewBox="0 0 45 45" style={{ transform: [{ rotate: '-90deg' }] }}>
                            <Circle
                              cx="22.5" cy="22.5" r={normalizedRadius}
                              stroke="#f1f5f9" strokeWidth={stroke} fill="transparent"
                            />
                            <Circle
                              cx="22.5" cy="22.5" r={normalizedRadius}
                              stroke={getStrokeColor(insight.color)}
                              strokeWidth={stroke} fill="transparent"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                            />
                          </Svg>
                          <Text className={`absolute font-bold text-[10px] ${getTextColor(insight.color)}`}>
                            %{insight.riskScore}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="font-bold text-gray-800 text-[11px] mb-1">{insight.title}</Text>
                          <Text className="text-[10px] text-gray-500 leading-tight">{insight.description}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Measurements */}
              <View className="p-5">
                {session.testResults.map((test) => {
                  const qInfo = formatQuality(test.overallQuality);
                  return (
                    <View key={test.id} className="border border-gray-100 rounded-2xl bg-gray-50 overflow-hidden mb-4">
                      <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row justify-between items-center">
                        <Text className="font-bold text-gray-800 text-sm">{formatTestType(test.testType)}</Text>
                        <View className={`${qInfo.bg} border ${qInfo.border} px-2 py-1 rounded-md`}>
                          <Text className={`${qInfo.textCol} text-[10px] font-bold`}>{qInfo.text}</Text>
                        </View>
                      </View>
                      
                      <View className="p-4">
                        {test.measurements.map((m) => (
                          <View key={m.id} className="flex-row justify-between items-center mb-2 last:mb-0">
                            <Text className="text-xs font-medium text-gray-600 flex-1">{formatMetricName(m.metricKey)}</Text>
                            <View className="flex-row items-center">
                              <Text className="text-xs font-bold text-indigo-900 mr-2">
                                {m.value.toFixed(1)} {m.unit}
                              </Text>
                              {m.quality !== "acceptable" && m.quality !== "good" && m.quality !== "excellent" && (
                                <View className="w-2 h-2 rounded-full bg-red-400" />
                              )}
                            </View>
                          </View>
                        ))}
                        {test.measurements.length === 0 && (
                          <Text className="text-xs text-gray-400 italic">Ölçüm verisi yok.</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
                {session.testResults.length === 0 && (
                  <Text className="text-center py-4 text-gray-500 text-xs">Bu oturumda modül sonucu bulunamadı.</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
