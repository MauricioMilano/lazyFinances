import { Transaction } from '@/types/finance';

const SCHEMA_VERSION = 1;
const SOURCE = 'lazy-finance';

export function toJSON(transactions: Transaction[]): string {
  const orderedTransactions = transactions.map(
    ({ id, date, description, amount, category, accountId, type, status }) => ({
      id,
      date,
      description,
      amount,
      category,
      accountId,
      type,
      status,
    })
  );

  const envelope = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    source: SOURCE,
    count: transactions.length,
    transactions: orderedTransactions,
  };
  return JSON.stringify(envelope);
}

const CSV_HEADERS = [
  'id',
  'date',
  'description',
  'amount',
  'category',
  'account_id',
  'type',
  'status',
] as const;

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCSV(transactions: Transaction[]): string {
  const lines: string[] = [];
  lines.push(CSV_HEADERS.join(','));
  for (const t of transactions) {
    const row = [
      csvEscape(t.id),
      csvEscape(t.date),
      csvEscape(t.description),
      csvEscape(String(t.amount)),
      csvEscape(t.category),
      csvEscape(t.accountId),
      csvEscape(t.type),
      csvEscape(t.status),
    ];
    lines.push(row.join(','));
  }
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function toXML(transactions: Transaction[]): string {
  const exportedAt = new Date().toISOString();
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<export schemaVersion="${SCHEMA_VERSION}" exportedAt="${xmlEscape(exportedAt)}" source="${SOURCE}" count="${transactions.length}">`
  );
  lines.push('  <transactions>');
  for (const t of transactions) {
    lines.push(
      `    <transaction id="${xmlEscape(t.id)}" date="${xmlEscape(t.date)}" description="${xmlEscape(t.description)}" amount="${xmlEscape(String(t.amount))}" category="${xmlEscape(t.category)}" accountId="${xmlEscape(t.accountId)}" type="${xmlEscape(t.type)}" status="${xmlEscape(t.status)}"/>`
    );
  }
  lines.push('  </transactions>');
  lines.push('</export>');
  return lines.join('\n');
}

export function downloadFile(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function localDateStamp(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
