import React from 'react';
import { View, Text } from 'react-native';
import { BaseToastProps } from 'react-native-toast-message';
import { CheckCircle2, XCircle, Info } from 'lucide-react-native';

export const toastConfig = {
  success: (props: BaseToastProps) => (
    <View className="flex-row items-center bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl shadow-sm mx-4 mt-2 w-[90%]">
      <CheckCircle2 color="#059669" size={24} />
      <View className="ml-3 flex-1">
        <Text className="text-emerald-800 font-bold text-sm">{props.text1}</Text>
        {props.text2 && <Text className="text-emerald-600 text-xs mt-0.5 font-medium">{props.text2}</Text>}
      </View>
    </View>
  ),
  error: (props: BaseToastProps) => (
    <View className="flex-row items-center bg-red-50 border border-red-200 px-4 py-3 rounded-2xl shadow-sm mx-4 mt-2 w-[90%]">
      <XCircle color="#dc2626" size={24} />
      <View className="ml-3 flex-1">
        <Text className="text-red-800 font-bold text-sm">{props.text1}</Text>
        {props.text2 && <Text className="text-red-600 text-xs mt-0.5 font-medium">{props.text2}</Text>}
      </View>
    </View>
  ),
  info: (props: BaseToastProps) => (
    <View className="flex-row items-center bg-sky-50 border border-sky-200 px-4 py-3 rounded-2xl shadow-sm mx-4 mt-2 w-[90%]">
      <Info color="#0284c7" size={24} />
      <View className="ml-3 flex-1">
        <Text className="text-sky-800 font-bold text-sm">{props.text1}</Text>
        {props.text2 && <Text className="text-sky-600 text-xs mt-0.5 font-medium">{props.text2}</Text>}
      </View>
    </View>
  ),
};
