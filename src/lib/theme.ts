import * as SecureStore from 'expo-secure-store';

export interface ThemeColor {
  id: string;
  label: string;
  hex: string;       // primary brand color
  hexLight: string;  // light bg (hover states, highlights)
  hexDark: string;   // darker shade for text/pressed state
}

export const THEME_COLORS: ThemeColor[] = [
  { id: 'blue',   label: 'Mavi',    hex: '#2563eb', hexLight: '#eff6ff', hexDark: '#1d4ed8' },
  { id: 'teal',   label: 'Teal',    hex: '#0d9488', hexLight: '#f0fdfa', hexDark: '#0f766e' },
  { id: 'purple', label: 'Mor',     hex: '#7c3aed', hexLight: '#f5f3ff', hexDark: '#6d28d9' },
  { id: 'green',  label: 'Yeşil',   hex: '#16a34a', hexLight: '#f0fdf4', hexDark: '#15803d' },
  { id: 'orange', label: 'Turuncu', hex: '#ea580c', hexLight: '#fff7ed', hexDark: '#c2410c' },
  { id: 'rose',   label: 'Pembe',   hex: '#e11d48', hexLight: '#fff1f2', hexDark: '#be123c' },
  { id: 'slate',  label: 'Gri',     hex: '#475569', hexLight: '#f8fafc', hexDark: '#334155' },
];

export const DEFAULT_THEME_ID = 'blue';
const THEME_STORE_KEY = 'app_theme_id';

export function getTheme(id: string): ThemeColor {
  return THEME_COLORS.find(t => t.id === id) ?? THEME_COLORS[0];
}

export async function saveTheme(id: string): Promise<void> {
  await SecureStore.setItemAsync(THEME_STORE_KEY, id);
}

export async function loadSavedTheme(): Promise<string> {
  try {
    const saved = await SecureStore.getItemAsync(THEME_STORE_KEY);
    return saved && THEME_COLORS.find(t => t.id === saved) ? saved : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

/** Build the full color tokens object from a ThemeColor */
export function buildColors(theme: ThemeColor) {
  return {
    brand: theme.hex,
    brandLight: theme.hexLight,
    brandDark: theme.hexDark,
    bgPrimary: '#ffffff',
    bgSecondary: '#f9fafb',
    bgSidebar: '#f8f9fa',
    borderPrimary: '#e5e7eb',
    textPrimary: '#111827',
    textSecondary: '#4b5563',
    textTertiary: '#9ca3af',
    bubbleAssistant: '#f3f4f6',
    bubbleAssistantText: '#1f2937',
  };
}

export type ColorTokens = ReturnType<typeof buildColors>;
