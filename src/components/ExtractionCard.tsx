import React from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFinance } from '@/hooks/use-finance';
import { extractTransactions } from '@/utils/ai-extraction';
import { toast } from 'sonner';

export function ExtractionCard() {
  const { data, addTransaction } = useFinance();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const selectedAccount = data.accounts[0]?.id || '';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const toastId = toast.loading('Extracting transactions with local AI...');
    
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const results = await extractTransactions(base64, data.config);
      
      if (results && results.length > 0) {
        results.forEach((t) => {
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
        
        toast.success(`Successfully imported ${results.length} transactions`, { id: toastId });
        
        // Refresh page after short delay to show success toast
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error('No transactions found in image', { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to process image', { id: toastId });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <Card className="relative overflow-hidden border-none bg-[#aa2d00] p-8 text-white rounded-xl shadow-lg">
      <div className="relative z-10">
        <h2 className="text-2xl font-medium mb-2">Import Statement</h2>
        <p className="text-white/80 mb-6 max-w-md">
          Upload a photo or screenshot. Transactions will be auto-inserted using your local AI model.
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
  );
}