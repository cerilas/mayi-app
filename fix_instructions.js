const fs = require('fs');
const file = 'src/app/(tabs)/settings.tsx';
let c = fs.readFileSync(file, 'utf8');

const regex = /<View className="flex-row items-center mb-2 gap-2">[\s\S]*?<\/TouchableOpacity>/;

const newBlock = `<View className="flex-row items-center mb-2 gap-2">
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
                  </TouchableOpacity>`;

c = c.replace(regex, newBlock);
fs.writeFileSync(file, c, 'utf8');
