import { useAIConfigStore } from '../store/ai-config';

export function useAIConfig() {
  const config = useAIConfigStore((s) => s.config);
  const updateConfig = useAIConfigStore((s) => s.updateConfig);
  return { config, updateConfig };
}
