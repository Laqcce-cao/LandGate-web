import { create } from 'zustand';

type Theme = 'light' | 'dark';
type ThemePreference = 'system' | Theme;

const STORAGE_KEY = 'theme-preference';

const getSystemTheme = (): Theme => {
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
};

const getInitialPreference = (): ThemePreference => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;

  // Older builds wrote a default "dark" value to `theme`; ignore it so the new default is system.
  localStorage.removeItem('theme');
  return 'system';
};

const resolveTheme = (preference: ThemePreference): Theme => {
  return preference === 'system' ? getSystemTheme() : preference;
};

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

interface ThemeState {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const preference = getInitialPreference();
  const theme = resolveTheme(preference);
  applyTheme(theme);

  if (window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', () => {
      if (get().preference !== 'system') return;
      const next = resolveTheme('system');
      applyTheme(next);
      set({ theme: next });
    });
  }

  return {
    theme,
    preference,
    setPreference: (nextPreference) => {
      localStorage.setItem(STORAGE_KEY, nextPreference);
      localStorage.removeItem('theme');
      const nextTheme = resolveTheme(nextPreference);
      applyTheme(nextTheme);
      set({ preference: nextPreference, theme: nextTheme });
    },
    toggleTheme: () => {
      const nextPreference: Theme = get().theme === 'dark' ? 'light' : 'dark';
      get().setPreference(nextPreference);
    },
  };
});
