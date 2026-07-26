import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttachmentStrip } from '../AttachmentStrip';
import { Attachment } from '@/hooks/use-file-attachments';

function makeAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: overrides.id ?? 'a-1',
    file: new File(['x'], overrides.name ?? 'a.csv', { type: 'text/csv' }),
    name: overrides.name ?? 'a.csv',
    size: overrides.size ?? 1024,
    type: overrides.type ?? 'csv',
    previewUrl: overrides.previewUrl,
  };
}

describe('AttachmentStrip', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when there are no attachments', () => {
    const { container } = render(<AttachmentStrip attachments={[]} onRemove={() => undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders each attachment and triggers onRemove after Confirm', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const att = makeAttachment({ id: 'x-1', name: 'hello.csv' });
    render(<AttachmentStrip attachments={[att]} onRemove={onRemove} />);
    expect(screen.getByText(/Pending \(1\)/i)).toBeInTheDocument();
    const tile = screen.getByTestId('attachment-tile');
    expect(tile).toHaveAttribute('data-attachment-id', 'x-1');
    const removeBtn = screen.getByTestId('attachment-remove');
    await user.click(removeBtn);
    const confirm = await screen.findByRole('button', { name: /^remove$/i });
    await user.click(confirm);
    expect(onRemove).toHaveBeenCalledWith('x-1');
  });

  it('Cancel in the confirm dialog does NOT remove', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const att = makeAttachment({ id: 'x-2', name: 'goodbye.csv' });
    render(<AttachmentStrip attachments={[att]} onRemove={onRemove} />);
    await user.click(screen.getByTestId('attachment-remove'));
    const cancel = await screen.findByRole('button', { name: /cancel/i });
    await user.click(cancel);
    expect(onRemove).not.toHaveBeenCalled();
  });
});
