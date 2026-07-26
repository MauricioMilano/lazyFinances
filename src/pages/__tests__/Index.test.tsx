import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Index from '../Index';
import { useFinanceStore } from '@/store/finance';
import { DEFAULT_ACCOUNTS } from '@/lib/defaults';
import type { FinanceData } from '@/types/finance';

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

vi.mock('@/components/Settings', () => ({
  Settings: () => <button>Settings</button>,
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

const baseData: FinanceData = {
  transactions: [],
  accounts: DEFAULT_ACCOUNTS,
  config: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'llama-3.2-vision' },
};

function renderIndex() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Index />
    </MemoryRouter>,
  );
}

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('1024'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
});

describe('Index page — add file wiring', () => {
  beforeEach(() => {
    useFinanceStore.setState({
      data: baseData,
      upload: initialUpload,
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the transactions section with the new "Add file" action', () => {
    renderIndex();
    expect(screen.getByRole('button', { name: /add row/i })).toBeInTheDocument();
    expect(screen.getByTestId('add-file-button')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('does not render the AttachmentStrip while no attachments are queued', () => {
    renderIndex();
    expect(screen.queryByLabelText(/pending attachments/i)).not.toBeInTheDocument();
  });

  it('the ExtractionCard keeps an "Add file" trigger', () => {
    renderIndex();
    const triggers = screen.getAllByRole('button', { name: /^add file$/i });
    expect(triggers.length).toBeGreaterThanOrEqual(1);
  });

  it('opens the modal when the new "Add file" button is clicked', async () => {
    const user = userEvent.setup();
    renderIndex();
    await user.click(screen.getByTestId('add-file-button'));
    expect(await screen.findByText(/drop files here/i)).toBeInTheDocument();
  });
});
