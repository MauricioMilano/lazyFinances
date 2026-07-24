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
import { Trash2, Loader2 } from 'lucide-react';
import { useFinanceStore } from '@/store/finance';

interface AirtableTableProps {
  transactions: Transaction[];
  accounts: Account[];
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}

export function AirtableTable({
  transactions,
  accounts,
  onUpdate,
  onDelete,
}: AirtableTableProps) {
  const upload = useFinanceStore((s) => s.upload);
  const percent = upload.total > 0 ? Math.round((upload.current / upload.total) * 100) : 0;

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
      <Table>
        <TableHeader className="bg-[#f8fafc]">
          <TableRow className="hover:bg-transparent border-b-[#dddddd]">
            <TableHead className="w-[120px] font-medium text-[#181d26]">Date</TableHead>
            <TableHead className="font-medium text-[#181d26]">Description</TableHead>
            <TableHead className="w-[120px] font-medium text-[#181d26]">Amount</TableHead>
            <TableHead className="w-[150px] font-medium text-[#181d26]">Category</TableHead>
            <TableHead className="w-[150px] font-medium text-[#181d26]">Account</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id} className="group border-b-[#dddddd] hover:bg-[#f8fafc]/50">
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
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(t.id)}
                  className="h-8 w-8 text-[#41454d] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {transactions.length === 0 && !upload.isProcessing && (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-[#41454d]">
                No transactions yet. Upload a statement or add one manually.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
