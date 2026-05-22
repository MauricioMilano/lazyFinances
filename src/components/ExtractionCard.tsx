import React from 'react';
import { Upload, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFinance } from '@/hooks/use-finance';
import { extractTransactions } from '@/utils/ai-extraction';
import { Transaction, Account } from '@/types/finance';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ExtractionCard() {
  const { data, addTransaction } = useFinance();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [previewTransactions, setPreviewTransactions] = React.useState<Partial<Transaction>[]>([]);
  const [showPreview, setShowPreview] = React.useState(false);
  const [selectedAccount, setSelectedAccount] = React.useState(data.accounts[0]?.id || '');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const results = await extractTransactions(base64, data.config);
      setPreviewTransactions(results);
      setShowPreview(true);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
      // Clear input
      e.target.value = '';
    }
  };

  const handleConfirm = () => {
    previewTransactions.forEach((t) => {
      addTransaction({
        date: t.date || new Date().toISOString().split('T')[0],
        description: t.description || 'Unknown Transaction',
        amount: t.amount || 0,
        category: t.category || 'Uncategorized',
        accountId: selectedAccount,
        type: t.type as 'income' | 'expense' || 'expense',
        status: 'confirmed',
      });
    });
    toast.success(`Successfully imported ${previewTransactions.length} transactions`);
    setShowPreview(false);
    setPreviewTransactions([]);
  };

  return (
    <>
      <Card className="relative overflow-hidden border-none bg-[#aa2d00] p-8 text-white rounded-xl shadow-lg">
        <div className="relative z-10">
          <h2 className="text-2xl font-medium mb-2">Import Statement</h2>
          <p className="text-white/80 mb-6 max-w-md">
            Upload a photo or screenshot of your bank statement. Our local AI will extract the data privately.
          </p>
          <div className="flex items-center gap-4">
            <Button
              asChild
              className="bg-white text-[#aa2d00] hover:bg-white/90 rounded-lg px-6 h-12 font-medium"
              disabled={isProcessing}
            >
              <label className="cursor-pointer flex items-center gap-2">
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isProcessing ? 'Processing...' : 'Upload Image'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
              </label>
            </Button>
          </div>
        </div>
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Review Extracted Transactions</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">Import to Account</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                {data.accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewTransactions.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell>{t.date}</TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(t.amount || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between items-center">
            <Button variant="ghost" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="bg-[#181d26] text-white">
              Confirm & Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
