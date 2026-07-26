import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface SettingsState {
  assistantIcon: string;
  setAssistantIcon: (iconId: string) => Promise<void>;
  loadSettings: () => Promise<void>;
}

const DEFAULT_ICON = 'pulse';

export const useSettingsStore = create<SettingsState>((set) => ({
  assistantIcon: DEFAULT_ICON,

  setAssistantIcon: async (iconId: string) => {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync('assistantIcon', iconId);
      }
      set({ assistantIcon: iconId });
    } catch (e) {
      console.error('Failed to save assistantIcon:', e);
      set({ assistantIcon: iconId });
    }
  },

  loadSettings: async () => {
    try {
      if (Platform.OS !== 'web') {
        const storedIcon = await SecureStore.getItemAsync('assistantIcon');
        if (storedIcon) {
          set({ assistantIcon: storedIcon });
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  },
}));
