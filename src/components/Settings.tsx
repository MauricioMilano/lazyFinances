import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
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
import { LMStudioConfig } from '@/types/finance';

interface SettingsProps {
  config: LMStudioConfig;
  onUpdateConfig: (config: LMStudioConfig) => void;
}

export function Settings({ config, onUpdateConfig }: SettingsProps) {
  const [localConfig, setLocalConfig] = React.useState(config);

  const handleSave = () => {
    onUpdateConfig(localConfig);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-lg">
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
            <Label htmlFor="model">Model Name</Label>
            <Input
              id="model"
              value={localConfig.model}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, model: e.target.value })
              }
              placeholder="llama-3.2-vision"
            />
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
