import React from 'react';
import { Settings as SettingsIcon, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchModels } from '@/utils/ai-extraction';
import { toast } from 'sonner';
import { useAIConfig } from '@/hooks/use-ai-config';

export function Settings() {
  const { config, updateConfig } = useAIConfig();
  const [localConfig, setLocalConfig] = React.useState(config);
  const [models, setModels] = React.useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = React.useState(false);

  const loadModels = React.useCallback(async (currentConfig: typeof config) => {
    setIsLoadingModels(true);
    try {
      const availableModels = await fetchModels(currentConfig);
      setModels(availableModels);
    } catch (error) {
      toast.error('Could not connect to LM Studio to fetch models');
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  React.useEffect(() => {
    loadModels(localConfig);
  }, [loadModels, localConfig]);

  const handleSave = () => {
    updateConfig(localConfig);
    toast.success('Settings saved');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-lg border-[#dddddd]">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>LM Studio Configuration</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={localConfig.baseUrl}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, baseUrl: e.target.value })
              }
              placeholder="http://localhost:1234/v1"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              value={localConfig.apiKey}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, apiKey: e.target.value })
              }
              placeholder="lm-studio"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="model">Model Name</Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => loadModels(localConfig)}
                disabled={isLoadingModels}
              >
                {isLoadingModels ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Select
                value={localConfig.model}
                onValueChange={(val) => setLocalConfig({ ...localConfig, model: val })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.length > 0 ? (
                    models.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      No models found. Check connection.
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Input
                className="w-1/3"
                value={localConfig.model}
                onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
                placeholder="Manual entry..."
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} className="rounded-lg bg-[#181d26] text-white">
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
