import { create } from 'zustand';
import { authApi, type User } from '../api/auth';

function isAdminRole(role: string): boolean {
  const r = role.toLowerCase();
  return r === 'admin' || r === 'super_admin';
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticating: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<string>;
  register: (email: string, password: string, captchaToken: string, username?: string) => Promise<string>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  loading: false,
  isAuthenticating: !!localStorage.getItem('access_token'),
  isAdmin: false,

  initialize: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ isAuthenticating: false });
      return;
    }
    try {
      const { data } = await authApi.me();
      const isAdmin = isAdminRole(data.role);
      set({
        user: data,
        token,
        isAdmin,
        isAuthenticating: false,
      });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({
        user: null,
        token: null,
        isAdmin: false,
        isAuthenticating: false,
      });
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { data } = await authApi.login({ email, password });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      const isAdmin = isAdminRole(data.user.role);
      set({
        user: data.user,
        token: data.access_token,
        isAdmin,
      });
      return isAdmin ? '/admin/dashboard' : '/dashboard';
    } finally {
      set({ loading: false });
    }
  },

  register: async (email: string, password: string, captchaToken: string, username?: string) => {
    set({ loading: true });
    try {
      await authApi.register({ email, password, captchaToken, username });
      // 注册成功后不再直接签发 token —— 需要先验证邮箱
      return email;
    } finally {
      set({ loading: false });
    }
  },

  updateUsername: async (username: string) => {
    await authApi.updateUsername(username);
    const user = get().user;
    if (user) {
      set({ user: { ...user, username } });
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, token: null, isAdmin: false });
    window.location.href = '/login';
  },

  fetchUser: async () => {
    try {
      const { data } = await authApi.me();
      set({
        user: data,
        isAdmin: isAdminRole(data.role),
      });
    } catch {
      get().logout();
    }
  },
}));
