import React from 'react';
import { Check, ImageIcon, FileText, FileSpreadsheet, FileJson, FileCode2, X } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Attachment, sizeLabel } from '@/hooks/use-file-attachments';
import { SupportedType } from '@/utils/file-parsers';

function stripIcon(type: SupportedType): React.ReactNode {
  if (type === 'pdf') return <FileText className="h-4 w-4" aria-hidden />;
  if (type === 'csv' || type === 'xls' || type === 'xlsx')
    return <FileSpreadsheet className="h-4 w-4" aria-hidden />;
  if (type === 'json') return <FileJson className="h-4 w-4" aria-hidden />;
  if (type === 'xml') return <FileCode2 className="h-4 w-4" aria-hidden />;
  return <ImageIcon className="h-4 w-4" aria-hidden />;
}

interface AttachmentStripProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

export function AttachmentStrip({ attachments, onRemove }: AttachmentStripProps) {
  const [pending, setPending] = React.useState<Attachment | null>(null);

  if (attachments.length === 0) return null;

  const pendingCount = attachments.filter((a) => !a.imported).length;
  const importedCount = attachments.length - pendingCount;

  return (
    <section
      aria-label="Pending attachments"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-[#dddddd] bg-[#f8fafc] p-3"
    >
      <span className="text-xs font-medium uppercase tracking-wider text-[#41454d]">
        {pendingCount > 0 ? `Pending (${pendingCount})` : 'Attached'} ·{' '}
        <span className="text-[#0c8a4f]">{importedCount} imported</span>
      </span>
      {attachments.map((att) => (
        <div
          key={att.id}
          className={
            'group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-white text-[#41454d] ' +
            (att.imported
              ? 'border-[#0c8a4f] ring-1 ring-[#0c8a4f]/30'
              : 'border-[#dddddd]')
          }
          title={`${att.name} · ${sizeLabel(att.size)}${att.imported ? ' · imported' : ''}`}
          data-testid="attachment-tile"
          data-attachment-id={att.id}
        >
          {att.previewUrl ? (
            <img
              src={att.previewUrl}
              alt={att.name}
              className="h-full w-full object-cover"
            />
          ) : (
            stripIcon(att.type)
          )}
          {att.imported && (
            <span
              aria-label="Imported"
              className="absolute right-0.5 top-0.5 rounded-full bg-[#0c8a4f] p-0.5 text-white"
            >
              <Check className="h-2.5 w-2.5" aria-hidden />
            </span>
          )}
          <button
            type="button"
            aria-label={`Remove ${att.name}`}
            onClick={() => setPending(att)}
            className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100"
            data-testid="attachment-remove"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
      <ConfirmModal
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Remove this attachment?"
        description={`${pending?.name ?? ''} will be removed from the attachment list and can be re-added later.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        intent="destructive"
        onConfirm={() => {
          if (pending) onRemove(pending.id);
          setPending(null);
        }}
      />
    </section>
  );
}
