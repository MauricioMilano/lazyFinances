import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExtractionCard } from '../ExtractionCard';
import { useFileAttachments } from '@/hooks/use-file-attachments';
import { useFinanceStore } from '@/store/finance';
import { DEFAULT_ACCOUNTS } from '@/lib/defaults';
import type { FinanceData } from '@/types/finance';

const emptyData: FinanceData = {
  transactions: [],
  accounts: DEFAULT_ACCOUNTS,
  config: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'llama-3.2-vision' },
};

const initialUpload = { isProcessing: false, current: 0, total: 0, fileName: '' };

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('@/utils/ai-extraction', () => ({
  extractTransactions: vi.fn(),
  fetchModels: vi.fn(),
}));

vi.mock('@/hooks/use-ai-config', () => ({
  useAIConfig: () => ({
    config: {
      baseUrl: 'http://localhost:1234/v1',
      apiKey: 'lm-studio',
      model: 'llama-3.2-vision',
    },
    updateConfig: vi.fn(),
  }),
}));

function Harness({ onAddFileClick }: { onAddFileClick?: () => void }) {
  const controller = useFileAttachments();
  return (
    <ExtractionCard
      controller={controller}
      onAddFileClick={onAddFileClick ?? (() => undefined)}
    />
  );
}

describe('ExtractionCard', () => {
  beforeEach(() => {
    useFinanceStore.setState({
      data: emptyData,
      upload: initialUpload,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders an "Add file" trigger button when no attachments are queued', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: /add file/i });
    expect(trigger).toBeInTheDocument();
  });

  it('forwards click on the trigger to the parent-supplied handler', () => {
    const handler = vi.fn();
    render(<Harness onAddFileClick={handler} />);
    const trigger = screen.getByRole('button', { name: /add file/i });
    trigger.click();
    expect(handler).toHaveBeenCalledOnce();
  });
});
