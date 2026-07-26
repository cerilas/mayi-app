import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  buildColors,
  ColorTokens,
  DEFAULT_THEME_ID,
  getTheme,
  loadSavedTheme,
  saveTheme,
  ThemeColor,
  THEME_COLORS,
} from '../lib/theme';

interface ThemeContextValue {
  colors: ColorTokens;
  themeId: string;
  themeColors: ThemeColor[];
  setTheme: (id: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: buildColors(getTheme(DEFAULT_THEME_ID)),
  themeId: DEFAULT_THEME_ID,
  themeColors: THEME_COLORS,
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<string>(DEFAULT_THEME_ID);
  const [colors, setColors] = useState<ColorTokens>(buildColors(getTheme(DEFAULT_THEME_ID)));

  useEffect(() => {
    loadSavedTheme().then(id => {
      setThemeId(id);
      setColors(buildColors(getTheme(id)));
    });
  }, []);

  const setTheme = useCallback(async (id: string) => {
    await saveTheme(id);
    setThemeId(id);
    setColors(buildColors(getTheme(id)));
  }, []);

  return (
    <ThemeContext.Provider value={{ colors, themeId, themeColors: THEME_COLORS, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
