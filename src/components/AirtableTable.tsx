import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Transaction, Account } from '@/types/finance';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Trash2, Loader2 } from 'lucide-react';
import { useFinanceStore } from '@/store/finance';
import { cn } from '@/lib/utils';

interface AirtableTableProps {
  transactions: Transaction[];
  accounts: Account[];
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}

function getBulkActionLabel(selectedCount: number, totalCount: number): string {
  if (selectedCount === 0 || selectedCount === totalCount) return 'Remove all rows';
  const missing = totalCount - selectedCount;
  return `Remove ${selectedCount} rows, ${missing} missing`;
}

export function AirtableTable({
  transactions,
  accounts,
  onUpdate,
  onDelete,
}: AirtableTableProps) {
  const upload = useFinanceStore((s) => s.upload);
  const percent = upload.total > 0 ? Math.round((upload.current / upload.total) * 100) : 0;
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [confirmBulkOpen, setConfirmBulkOpen] = React.useState(false);
  const headerCheckboxRef = React.useRef<HTMLInputElement>(null);

  const selectedCount = selectedIds.size;
  const totalCount = transactions.length;

  React.useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate =
        selectedCount > 0 && selectedCount < totalCount;
    }
  }, [selectedCount, totalCount]);

  const toggleRow = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleHeaderToggle = React.useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === transactions.length) return new Set();
      return new Set(transactions.map((t) => t.id));
    });
  }, [transactions]);

  const handleBulkActionClick = () => {
    if (selectedCount === 0) {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
    setConfirmBulkOpen(true);
  };

  const handleBulkConfirm = () => {
    Array.from(selectedIds).forEach((id) => onDelete(id));
    setSelectedIds(new Set());
    setConfirmBulkOpen(false);
  };

  const bulkActionLabel = getBulkActionLabel(selectedCount, totalCount);

  return (
    <div className="rounded-lg border border-[#dddddd] bg-white overflow-hidden">
      {upload.isProcessing && (
        <div className="border-b border-[#dddddd] bg-[#f8fafc] px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-[#181d26]">
              <Loader2 className="h-4 w-4 animate-spin text-[#254fad]" />
              <span>
                Processing{' '}
                <span className="font-medium">{upload.fileName || 'file'}</span>{' '}
                <span className="text-[#41454d]">
                  ({upload.current}/{upload.total})
                </span>
              </span>
            </div>
            <span className="text-xs text-[#41454d] tabular-nums">{percent}%</span>
          </div>
          <Progress value={percent} className="h-1.5" />
        </div>
      )}
      {totalCount > 0 && (
        <div className="flex items-center justify-between gap-4 border-b border-[#dddddd] bg-[#f8fafc] px-4 py-2">
          <span className="text-xs text-[#41454d] tabular-nums">
            {selectedCount > 0
              ? `${selectedCount} of ${totalCount} selected`
              : `${totalCount} ${totalCount === 1 ? 'row' : 'rows'}`}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkActionClick}
            disabled={totalCount === 0}
            className="rounded-lg flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {bulkActionLabel}
          </Button>
        </div>
      )}
      <Table>
        <TableHeader className="bg-[#f8fafc]">
          <TableRow className="hover:bg-transparent border-b-[#dddddd]">
            <TableHead className="w-[40px] font-medium text-[#181d26] px-3">
              {totalCount > 0 ? (
                <input
                  type="checkbox"
                  ref={headerCheckboxRef}
                  aria-label="Select all rows"
                  checked={selectedCount === totalCount}
                  onChange={handleHeaderToggle}
                  className="h-4 w-4 cursor-pointer accent-[#181d26]"
                />
              ) : (
                <span className="sr-only">Select</span>
              )}
            </TableHead>
            <TableHead className="w-[120px] font-medium text-[#181d26]">Date</TableHead>
            <TableHead className="font-medium text-[#181d26]">Description</TableHead>
            <TableHead className="w-[120px] font-medium text-[#181d26]">Amount</TableHead>
            <TableHead className="w-[150px] font-medium text-[#181d26]">Category</TableHead>
            <TableHead className="w-[150px] font-medium text-[#181d26]">Account</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => {
            const isSelected = selectedIds.has(t.id);
            return (
              <TableRow
                key={t.id}
                className={cn(
                  'group border-b-[#dddddd] hover:bg-[#f8fafc]/50',
                  isSelected && 'bg-[#f8fafc]',
                )}
              >
                <TableCell className="px-3">
                  <input
                    type="checkbox"
                    aria-label={`Select transaction ${t.description || t.id}`}
                    checked={isSelected}
                    onChange={() => toggleRow(t.id)}
                    className="h-4 w-4 cursor-pointer accent-[#181d26]"
                  />
                </TableCell>
                <TableCell className="p-0">
                  <Input
                    type="date"
                    value={t.date}
                    onChange={(e) => onUpdate(t.id, { date: e.target.value })}
                    className="border-none shadow-none focus-visible:ring-1 focus-visible:ring-[#254fad] rounded-none h-10 px-3 bg-transparent"
                  />
                </TableCell>
                <TableCell className="p-0">
                  <Input
                    value={t.description}
                    onChange={(e) => onUpdate(t.id, { description: e.target.value })}
                    className="border-none shadow-none focus-visible:ring-1 focus-visible:ring-[#254fad] rounded-none h-10 px-3 bg-transparent"
                  />
                </TableCell>
                <TableCell className="p-0">
                  <Input
                    type="number"
                    value={t.amount}
                    onChange={(e) => onUpdate(t.id, { amount: parseFloat(e.target.value) || 0 })}
                    className="border-none shadow-none focus-visible:ring-1 focus-visible:ring-[#254fad] rounded-none h-10 px-3 bg-transparent"
                  />
                </TableCell>
                <TableCell className="p-0">
                  <Input
                    value={t.category}
                    onChange={(e) => onUpdate(t.id, { category: e.target.value })}
                    className="border-none shadow-none focus-visible:ring-1 focus-visible:ring-[#254fad] rounded-none h-10 px-3 bg-transparent"
                  />
                </TableCell>
                <TableCell className="p-0">
                  <Select
                    value={t.accountId}
                    onValueChange={(val) => onUpdate(t.id, { accountId: val })}
                  >
                    <SelectTrigger className="border-none shadow-none focus:ring-1 focus:ring-[#254fad] rounded-none h-10 px-3 bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })}
          {transactions.length === 0 && !upload.isProcessing && (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-[#41454d]">
                No transactions yet. Upload a statement or add one manually.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <ConfirmModal
        open={confirmBulkOpen}
        onOpenChange={setConfirmBulkOpen}
        title={
          selectedCount === 1
            ? 'Delete this transaction?'
            : `Delete ${selectedCount} transactions?`
        }
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        intent="destructive"
        onConfirm={handleBulkConfirm}
      />
    </div>
  );
}
