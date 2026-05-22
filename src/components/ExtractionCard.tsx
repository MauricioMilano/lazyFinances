import React from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFinance } from '@/hooks/use-finance';
import { extractTransactions } from '@/utils/ai-extraction';
import { toast } from 'sonner';

export function ExtractionCard() {
  const { data, addTransactions } = useFinance();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const selectedAccount = data.accounts[0]?.id || '';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const totalFiles = files.length;
    const toastId = toast.loading(`Preparing to process ${totalFiles} file${totalFiles > 1 ? 's' : ''}...`);
    
    const allResults: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        toast.loading(`Processing file ${i + 1} of ${totalFiles}: ${file.name}...`, { id: toastId });

        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
          reader.readAsDataURL(file);
          const base64 = await base64Promise;

          const results = await extractTransactions(base64, data.config);
          
          if (results && results.length > 0) {
            results.forEach((t) => {
              allResults.push({
                date: t.date || new Date().toISOString().split('T')[0],
                description: t.description || 'Unknown Transaction',
                amount: t.amount || 0,
                category: t.category || 'Uncategorized',
                accountId: selectedAccount,
                type: t.type as 'income' | 'expense' || 'expense',
                status: 'confirmed',
              });
            });
            successCount++;
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          errorCount++;
        }
      }

      if (allResults.length > 0) {
        addTransactions(allResults);
        
        let message = `Successfully processed ${successCount} file${successCount > 1 ? 's' : ''}`;
        if (allResults.length > 0) {
          message += ` and imported ${allResults.length} transaction${allResults.length > 1 ? 's' : ''}.`;
        }
        
        if (errorCount > 0) {
          message += ` (${errorCount} file${errorCount > 1 ? 's' : ''} failed)`;
          toast.info(message, { id: toastId });
        } else {
          toast.success(message, { id: toastId });
        }
      } else if (errorCount > 0) {
        toast.error(`Failed to process ${errorCount} file${errorCount > 1 ? 's' : ''}.`, { id: toastId });
      } else {
        toast.error('No transactions found in the uploaded files.', { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to process images', { id: toastId });
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
                multiple
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