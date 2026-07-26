import * as React from 'react';
import { useFinance } from '@/hooks/use-finance';
import { useFileAttachments } from '@/hooks/use-file-attachments';
import { AirtableTable } from '@/components/AirtableTable';
import { ExtractionCard } from '@/components/ExtractionCard';
import { Settings } from '@/components/Settings';
import { ExportButton } from '@/components/ExportButton';
import { AttachmentStrip } from '@/components/AttachmentStrip';
import { AddFileModal } from '@/components/AddFileModal';
import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Index() {
  const {
    data,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useFinance();
  const fileAttachments = useFileAttachments();
  const [addFileOpen, setAddFileOpen] = React.useState(false);

  const handleAddManual = () => {
    addTransaction({
      date: new Date().toISOString().split('T')[0],
      description: 'New Transaction',
      amount: 0,
      category: 'General',
      accountId: data.accounts[0]?.id || '1',
      type: 'expense',
      status: 'confirmed',
    });
  };

  const totalBalance = data.transactions.reduce((acc, t) => {
    return t.type === 'expense' ? acc - t.amount : acc + t.amount;
  }, 0);

  return (
    <div className="min-h-screen bg-white text-[#181d26] font-sans">
      {/* Top Nav */}
      <nav className="h-16 border-b border-[#dddddd] flex items-center justify-between px-8 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-medium tracking-tight">Aether Finance</h1>
          <div className="hidden md:flex gap-6 text-sm font-medium text-[#41454d]">
            <a href="#" className="text-[#181d26]">Dashboard</a>
            <a href="#" className="hover:text-[#181d26] transition-colors">Analytics</a>
            <a href="#" className="hover:text-[#181d26] transition-colors">Accounts</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Settings />
          <Button className="rounded-lg bg-[#181d26] text-white hover:bg-[#0d1218] transition-colors px-4">
            Sign up for free
          </Button>
        </div>
      </nav>

      <main className="max-w-[1280px] mx-auto px-8 py-12">
        {/* Hero / Header Section */}
        <section className="mb-12">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="text-sm font-medium text-[#41454d] mb-1 uppercase tracking-wider">Financial Overview</p>
              <h2 className="text-4xl font-medium tracking-tight">Manage your capital.</h2>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-[#41454d] mb-1">Total Balance</p>
              <p className="text-3xl font-medium tracking-tight">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(totalBalance)}
              </p>
            </div>
          </div>

          <ExtractionCard
            controller={fileAttachments}
            onAddFileClick={() => setAddFileOpen(true)}
          />
        </section>

        {/* Table Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-medium tracking-tight">Transactions</h3>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddManual}
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-[#dddddd] flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Row
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-[#dddddd] flex items-center gap-2"
                  onClick={() => setAddFileOpen(true)}
                  data-testid="add-file-button"
                >
                  <Upload className="h-4 w-4" />
                  Add file
                </Button>
                <ExportButton transactions={data.transactions} />
              </div>
            </div>
          </div>

          <AttachmentStrip
            attachments={fileAttachments.attachments}
            onRemove={fileAttachments.remove}
          />

          <AirtableTable
            transactions={data.transactions}
            accounts={data.accounts}
            onUpdate={updateTransaction}
            onDelete={deleteTransaction}
          />
        </section>

        {/* Info Grid */}
        <section className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 bg-[#f5e9d4] rounded-xl border-none">
            <h4 className="font-medium mb-2">Privacy First</h4>
            <p className="text-sm text-[#181d26]/80 leading-relaxed">
              Your financial data never leaves your machine. AI processing happens locally via LM Studio.
            </p>
          </div>
          <div className="p-6 bg-[#a8d8c4] rounded-xl border-none">
            <h4 className="font-medium mb-2">BYOK Strategy</h4>
            <p className="text-sm text-[#181d26]/80 leading-relaxed">
              Bring your own local model. Flexible, cost-effective, and fully under your control.
            </p>
          </div>
          <div className="p-6 bg-[#fcab79] rounded-xl border-none">
            <h4 className="font-medium mb-2">Instant Extraction</h4>
            <p className="text-sm text-[#181d26]/80 leading-relaxed">
              Snap a photo, drop a PDF, paste a CSV — get structured data. No more manual entry for complex bank statements.
            </p>
          </div>
        </section>
      </main>

      <AddFileModal
        open={addFileOpen}
        onOpenChange={setAddFileOpen}
        controller={fileAttachments}
      />

      <footer className="border-t border-[#dddddd] py-12 px-8 mt-24">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between gap-12">
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Aether Finance</h2>
            <p className="text-sm text-[#41454d] max-w-xs">
              The editorial way to manage your personal or business finances with local AI.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#41454d]">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-[#181d26] transition-colors">Overview</a></li>
                <li><a href="#" className="hover:text-[#181d26] transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-[#181d26] transition-colors">Privacy</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#41454d]">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-[#181d26] transition-colors">About</a></li>
                <li><a href="#" className="hover:text-[#181d26] transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-[#181d26] transition-colors">Careers</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#41454d]">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-[#181d26] transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-[#181d26] transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto border-t border-[#dddddd] mt-12 pt-8 flex justify-between items-center text-xs text-[#41454d]">
          <p>© 2024 Aether Finance Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[#181d26]">Twitter</a>
            <a href="#" className="hover:text-[#181d26]">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
