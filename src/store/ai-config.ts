import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LMStudioConfig } from '../types/finance';

const STORAGE_KEY = 'aether_ai_config';
const LEGACY_FINANCE_KEY = 'aether_finance_data';

export const DEFAULT_CONFIG: LMStudioConfig = {
  baseUrl: 'http://localhost:1234/v1',
  apiKey: 'lm-studio',
  model: 'llama-3.2-vision',
};

interface AIConfigStore {
  config: LMStudioConfig;
  updateConfig: (config: LMStudioConfig) => void;
}

const migrateLegacyConfig = (): LMStudioConfig | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_FINANCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const candidate = parsed?.state?.data?.config ?? parsed?.data?.config;
    if (
      candidate &&
      typeof candidate.baseUrl === 'string' &&
      typeof candidate.apiKey === 'string' &&
      typeof candidate.model === 'string'
    ) {
      return candidate as LMStudioConfig;
    }
  } catch (error) {
    console.warn('Failed to migrate legacy AI config from', LEGACY_FINANCE_KEY, error);
  }
  return null;
};

const getInitialConfig = (): LMStudioConfig => {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return DEFAULT_CONFIG;
  } catch {
    // ignore — fall through to migration
  }
  return migrateLegacyConfig() ?? DEFAULT_CONFIG;
};

export const useAIConfigStore = create<AIConfigStore>()(
  persist(
    (set) => ({
      config: getInitialConfig(),
      updateConfig: (config) => set({ config }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
