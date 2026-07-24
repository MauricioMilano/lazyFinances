import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Transaction } from '@/types/finance';
import {
  toCSV,
  toJSON,
  toXML,
  downloadFile,
  localDateStamp,
} from '@/utils/export';

interface ExportButtonProps {
  transactions: Transaction[];
}

export function ExportButton({ transactions }: ExportButtonProps) {
  const isEmpty = transactions.length === 0;
  const date = localDateStamp();
  const base = `lazy-finance-transactions-${date}`;

  const handleJSON = () => {
    downloadFile(`${base}.json`, toJSON(transactions), 'application/json');
  };
  const handleCSV = () => {
    downloadFile(`${base}.csv`, toCSV(transactions), 'text/csv;charset=utf-8');
  };
  const handleXML = () => {
    downloadFile(`${base}.xml`, toXML(transactions), 'application/xml');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isEmpty}
          className="rounded-lg border-[#dddddd] flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleJSON}>Export as JSON</DropdownMenuItem>
        <DropdownMenuItem onClick={handleCSV}>Export as CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={handleXML}>Export as XML</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
