import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  patientProfile?: any;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const isJwt = (value: unknown): value is string => (
  typeof value === 'string'
  && value.split('.').length === 3
  && value.split('.').every(Boolean)
);

const clearStoredAuth = async () => {
  if (Platform.OS === 'web') return;

  await Promise.all([
    SecureStore.deleteItemAsync('token'),
    SecureStore.deleteItemAsync('user'),
  ]);
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  login: async (token, user) => {
    if (!isJwt(token)) {
      throw new Error('Sunucu geçerli bir oturum anahtarı döndürmedi.');
    }

    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(user));
      }
      set({ token, user });
    } catch (e) {
      console.error('SecureStore set error:', e);
      set({ token, user });
    }
  },

  logout: async () => {
    try {
      await clearStoredAuth();
      set({ token: null, user: null });
    } catch (e) {
      console.error('SecureStore delete error:', e);
      set({ token: null, user: null });
    }
  },

  checkAuth: async () => {
    try {
      if (Platform.OS === 'web') {
        set({ isLoading: false });
        return;
      }
      
      const token = await SecureStore.getItemAsync('token');
      const userStr = await SecureStore.getItemAsync('user');
      
      if (isJwt(token) && userStr) {
        set({ token, user: JSON.parse(userStr), isLoading: false });
      } else {
        await clearStoredAuth();
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error checking auth in SecureStore:', error);
      await clearStoredAuth().catch(() => undefined);
      set({ token: null, user: null, isLoading: false });
    }
  },
}));
