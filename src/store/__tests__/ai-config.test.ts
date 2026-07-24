import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'aether_ai_config';
const LEGACY_FINANCE_KEY = 'aether_finance_data';

const importFresh = async () => {
  vi.resetModules();
  return await import('../ai-config');
};

describe('ai-config store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('updateConfig', () => {
    it('replaces the entire config and persists it', async () => {
      const { useAIConfigStore, DEFAULT_CONFIG } = await importFresh();
      useAIConfigStore.getState().updateConfig({
        ...DEFAULT_CONFIG,
        model: 'qwen2.5-vl-7b',
      });

      expect(useAIConfigStore.getState().config.model).toBe('qwen2.5-vl-7b');
      await new Promise((r) => setTimeout(r, 0));
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.config.model).toBe('qwen2.5-vl-7b');
    });
  });

  describe('initial config resolution', () => {
    it('falls back to DEFAULT_CONFIG when storage is empty', async () => {
      const { useAIConfigStore, DEFAULT_CONFIG } = await importFresh();
      expect(useAIConfigStore.getState().config).toEqual(DEFAULT_CONFIG);
    });

    it('migrates a valid legacy config under aether_finance_data', async () => {
      const legacyConfig = {
        baseUrl: 'http://legacy:9999/v1',
        apiKey: 'legacy-key',
        model: 'legacy-model',
      };
      localStorage.setItem(
        LEGACY_FINANCE_KEY,
        JSON.stringify({ state: { data: { config: legacyConfig } } })
      );

      const { useAIConfigStore } = await importFresh();
      expect(useAIConfigStore.getState().config).toEqual(legacyConfig);
    });

    it('also accepts a top-level data.config legacy shape', async () => {
      const legacyConfig = {
        baseUrl: 'http://legacy:9999/v1',
        apiKey: 'legacy-key',
        model: 'legacy-model',
      };
      localStorage.setItem(
        LEGACY_FINANCE_KEY,
        JSON.stringify({ data: { config: legacyConfig } })
      );

      const { useAIConfigStore } = await importFresh();
      expect(useAIConfigStore.getState().config).toEqual(legacyConfig);
    });

    it('returns DEFAULT_CONFIG when legacy data is missing', async () => {
      // No legacy key, no new key
      const { useAIConfigStore, DEFAULT_CONFIG } = await importFresh();
      expect(useAIConfigStore.getState().config).toEqual(DEFAULT_CONFIG);
    });

    it('returns DEFAULT_CONFIG when legacy data is malformed JSON', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem(LEGACY_FINANCE_KEY, 'this is not json');

      const { useAIConfigStore, DEFAULT_CONFIG } = await importFresh();
      expect(useAIConfigStore.getState().config).toEqual(DEFAULT_CONFIG);
      expect(warn).toHaveBeenCalled();
    });

    it('returns DEFAULT_CONFIG when legacy config is missing required string fields', async () => {
      localStorage.setItem(
        LEGACY_FINANCE_KEY,
        JSON.stringify({ state: { data: { config: { baseUrl: 'x' } } } })
      );
      const { useAIConfigStore, DEFAULT_CONFIG } = await importFresh();
      expect(useAIConfigStore.getState().config).toEqual(DEFAULT_CONFIG);
    });

    it('returns DEFAULT_CONFIG when legacy config has wrong types', async () => {
      localStorage.setItem(
        LEGACY_FINANCE_KEY,
        JSON.stringify({
          state: {
            data: {
              config: { baseUrl: 123, apiKey: null, model: ['a', 'b'] },
            },
          },
        })
      );
      const { useAIConfigStore, DEFAULT_CONFIG } = await importFresh();
      expect(useAIConfigStore.getState().config).toEqual(DEFAULT_CONFIG);
    });

    it('is SSR-safe (no window)', async () => {
      const originalWindow = globalThis.window;
      (globalThis as { window?: unknown }).window = undefined;

      const { useAIConfigStore, DEFAULT_CONFIG } = await importFresh();
      expect(useAIConfigStore.getState().config).toEqual(DEFAULT_CONFIG);

      globalThis.window = originalWindow;
    });
  });
});
