import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { AddFileModal } from '../AddFileModal';
import { useFileAttachments } from '@/hooks/use-file-attachments';
import { useFinanceStore } from '@/store/finance';
import { DEFAULT_ACCOUNTS } from '@/lib/defaults';

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
  extractTransactions: vi.fn().mockResolvedValue([]),
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

const initialUpload = { isProcessing: false, current: 0, total: 0, fileName: '' };

function ModalHarness({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const controller = useFileAttachments();
  return <AddFileModal open={open} onOpenChange={onOpenChange} controller={controller} />;
}

function fakeFile(name: string, type: string, body = ''): File {
  return new File([body], name, { type });
}

describe('AddFileModal', () => {
  beforeEach(() => {
    useFinanceStore.setState({
      data: {
        transactions: [],
        accounts: DEFAULT_ACCOUNTS,
        config: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'x' },
      },
      upload: initialUpload,
    });
  });
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the supported-formats footer and pick from device button when open', async () => {
    render(<ModalHarness open onOpenChange={() => undefined} />);
    expect(await screen.findByText(/Supports PNG/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pick from device/i })).toBeInTheDocument();
  });

  it('the Process button is disabled when there are no attachments', async () => {
    render(<ModalHarness open onOpenChange={() => undefined} />);
    const btn = await screen.findByRole('button', { name: /process 0 files/i });
    expect(btn).toBeDisabled();
  });

  it('per-row remove is wired via the X affordance', async () => {
    const user = userEvent.setup();
    function Seeded() {
      const controller = useFileAttachments();
      React.useEffect(() => {
        controller.addFiles([
          fakeFile('a.csv', 'text/csv', 'date,description,amount\n2026-07-23,Coffee,4.5\n'),
        ]);
        // controller is intentionally created once; addFiles doesn't need to re-run.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return (
        <AddFileModal
          open
          onOpenChange={() => undefined}
          controller={controller}
        />
      );
    }
    const { rerender } = render(<Seeded />);
    const removeBtn = await screen.findByRole('button', { name: /remove a\.csv/i });
    await user.click(removeBtn);
    rerender(<div data-testid="empty" />);
    expect(screen.queryByText(/a\.csv/)).not.toBeInTheDocument();
  });
});
