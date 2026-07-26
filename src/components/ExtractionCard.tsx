import React from 'react';
import { Upload, Image as ImageIcon, FileText, FileSpreadsheet, FileJson, FileCode2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SupportedType } from '@/utils/file-parsers';
import { useFileAttachments, sizeLabel, Attachment } from '@/hooks/use-file-attachments';

interface ExtractionCardProps {
  controller: ReturnType<typeof useFileAttachments>;
  onAddFileClick: () => void;
}

function cardIcon(type: SupportedType): React.ReactNode {
  if (type === 'pdf') return <FileText className="h-5 w-5" aria-hidden />;
  if (type === 'csv' || type === 'xls' || type === 'xlsx')
    return <FileSpreadsheet className="h-5 w-5" aria-hidden />;
  if (type === 'json') return <FileJson className="h-5 w-5" aria-hidden />;
  if (type === 'xml') return <FileCode2 className="h-5 w-5" aria-hidden />;
  return <ImageIcon className="h-5 w-5" aria-hidden />;
}

function CardAttachment({ attachment, onRemove }: { attachment: Attachment; onRemove: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1 text-xs">
      <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-md border border-white/20 bg-white/5">
        {attachment.previewUrl ? (
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            className="h-full w-full object-cover"
          />
        ) : (
          cardIcon(attachment.type)
        )}
      </div>
      <span className="max-w-[140px] truncate" title={attachment.name}>
        {attachment.name}
      </span>
      <span className="text-white/60">{sizeLabel(attachment.size)}</span>
      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        aria-label={`Remove ${attachment.name}`}
        className="ml-1 rounded-md p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </div>
  );
}

export function ExtractionCard({ controller, onAddFileClick }: ExtractionCardProps) {
  const { attachments, remove } = controller;
  const hasAttachments = attachments.length > 0;
  const pendingCount = attachments.filter((a) => !a.imported).length;
  const importedCount = attachments.length - pendingCount;

  return (
    <Card className="relative overflow-hidden border-none bg-[#aa2d00] p-8 text-white rounded-xl shadow-lg">
      <div className="relative z-10">
        <h2 className="text-2xl font-medium mb-2">Add file</h2>
        <p className="text-white/80 mb-6 max-w-md">
          Drop a file, pick from your device, or paste with Ctrl/Cmd+V. Transactions will be auto-inserted using your local AI model and structured parsers.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            className="bg-white text-[#aa2d00] hover:bg-white/90 rounded-lg px-6 h-12 font-medium"
            onClick={onAddFileClick}
          >
            <Upload className="mr-2 h-4 w-4" aria-hidden />
            {hasAttachments ? `Add more (${pendingCount})` : 'Add file'}
          </Button>
          {hasAttachments && (
            <span className="flex items-center gap-1 text-xs text-white/80">
              {pendingCount} pending · {importedCount} imported
            </span>
          )}
        </div>
        {hasAttachments && (
          <div className="mt-4 flex flex-wrap gap-2">
            {attachments.slice(0, 6).map((att) => (
              <CardAttachment key={att.id} attachment={att} onRemove={remove} />
            ))}
            {attachments.length > 6 && (
              <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70">
                {`+${attachments.length - 6} more`}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
    </Card>
  );
}
