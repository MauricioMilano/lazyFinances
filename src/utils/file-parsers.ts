import { LMStudioConfig, Transaction } from '../types/finance';

export type SupportedType =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'gif'
  | 'pdf'
  | 'csv'
  | 'json'
  | 'xml'
  | 'xls'
  | 'xlsx';

export interface ParsedTransactions {
  type: SupportedType;
  transactions: Array<Omit<Transaction, 'id' | 'accountId'>>;
  warnings: string[];
}

const SUPPORTED: Record<SupportedType, string[]> = {
  png: ['image/png'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  pdf: ['application/pdf'],
  csv: ['text/csv', 'application/csv'],
  json: ['application/json', 'text/json'],
  xml: ['application/xml', 'text/xml'],
  xls: ['application/vnd.ms-excel'],
  xlsx: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
  ],
};

const EXT_TO_TYPE: Record<string, SupportedType> = {
  png: 'png',
  jpg: 'jpeg',
  jpeg: 'jpeg',
  webp: 'webp',
  gif: 'gif',
  pdf: 'pdf',
  csv: 'csv',
  json: 'json',
  xml: 'xml',
  xls: 'xls',
  xlsx: 'xlsx',
};

export function inferSupportedType(file: File): SupportedType | null {
  const mime = file.type.toLowerCase();
  if (mime) {
    for (const [type, mimes] of Object.entries(SUPPORTED)) {
      if (mimes.includes(mime)) return type as SupportedType;
    }
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_TYPE[ext] ?? null;
}

export function isImage(type: SupportedType): boolean {
  return type === 'png' || type === 'jpeg' || type === 'webp' || type === 'gif';
}

const FORMULA_PREFIXES = new Set(['=', '+', '-', '@']);

function escapeFormula(value: string): string {
  if (!value) return value;
  return FORMULA_PREFIXES.has(value[0]) ? `'${value}` : value;
}

function defaultTx(): Omit<Transaction, 'id' | 'accountId'> {
  return {
    date: new Date().toISOString().split('T')[0],
    description: 'Unknown Transaction',
    amount: 0,
    category: 'Uncategorized',
    type: 'expense',
    status: 'confirmed',
  };
}

function coerceRow(
  raw: Record<string, unknown>,
  warnings: string[],
  rowIndex: number,
): Omit<Transaction, 'id' | 'accountId'> | null {
  const row = { ...defaultTx(), ...raw } as Record<string, unknown>;
  const dateVal = row.date;
  let iso: string | null = null;
  if (typeof dateVal === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateVal)) iso = dateVal.slice(0, 10);
    else {
      const d = new Date(dateVal);
      if (!Number.isNaN(d.getTime())) iso = d.toISOString().slice(0, 10);
    }
  } else if (dateVal instanceof Date) {
    iso = dateVal.toISOString().slice(0, 10);
  }
  if (!iso) {
    warnings.push(`row ${rowIndex}: invalid date; skipped`);
    return null;
  }
  const amountNum = Number(row.amount);
  if (!Number.isFinite(amountNum)) {
    warnings.push(`row ${rowIndex}: invalid amount; skipped`);
    return null;
  }
  const tx: Omit<Transaction, 'id' | 'accountId'> = {
    date: iso,
    description: escapeFormula(String(row.description ?? '').trim() || 'Unknown Transaction'),
    amount: Math.abs(amountNum),
    category: escapeFormula(String(row.category ?? 'Uncategorized').trim() || 'Uncategorized'),
    type:
      typeof row.type === 'string' && (row.type === 'income' || row.type === 'expense')
        ? (row.type as 'income' | 'expense')
        : amountNum < 0
          ? 'income'
          : 'expense',
    status:
      typeof row.status === 'string' && (row.status === 'confirmed' || row.status === 'pending')
        ? (row.status as 'confirmed' | 'pending')
        : 'confirmed',
  };
  return tx;
}

function parseRfc4180(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') {
        row.push(cell);
        cell = '';
      } else if (c === '\r') {
        // ignore; \n handles line break
      } else if (c === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += c;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const HEADER_ALIASES: Record<string, string[]> = {
  date: ['date', 'transaction date', 'posted date', 'data'],
  description: ['description', 'memo', 'details', 'narrative', 'payee'],
  amount: ['amount', 'value', 'total'],
  category: ['category', 'type', 'tag'],
  type: ['type', 'kind', 'flow'],
  status: ['status', 'state'],
};

function mapHeader(header: string): string | null {
  const norm = header.trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(norm)) return canonical;
  }
  return null;
}

async function parseCsvImpl(file: File): Promise<ParsedTransactions> {
  const text = await file.text();
  const rows = parseRfc4180(text).filter((r) => r.length > 0 && !(r.length === 1 && r[0] === ''));
  if (rows.length < 2) {
    return { type: 'csv', transactions: [], warnings: ['empty or header-only CSV'] };
  }
  const headerCells = rows[0];
  const mapping: Record<number, string> = {};
  headerCells.forEach((cell, idx) => {
    const key = mapHeader(cell);
    if (key) mapping[idx] = key;
  });
  const warnings: string[] = [];
  const transactions: Array<Omit<Transaction, 'id' | 'accountId'>> = [];
  for (let i = 1; i < rows.length; i++) {
    const raw: Record<string, unknown> = {};
    rows[i].forEach((cell, idx) => {
      const key = mapping[idx];
      if (key) raw[key] = cell;
    });
    const tx = coerceRow(raw, warnings, i);
    if (tx) transactions.push(tx);
  }
  return { type: 'csv', transactions, warnings };
}

async function parseJsonImpl(file: File): Promise<ParsedTransactions> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { type: 'json', transactions: [], warnings: [`malformed JSON: ${(e as Error).message}`] };
  }
  let rows: unknown[] = [];
  let envelopeNote: string | null = null;
  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (parsed !== null && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const inner = obj.transactions;
    if (Array.isArray(inner)) {
      rows = inner;
      envelopeNote =
        typeof obj.source === 'string'
          ? `detected export envelope (${obj.source}); using nested transactions`
          : 'detected export envelope; using nested transactions';
    } else {
      return {
        type: 'json',
        transactions: [],
        warnings: ['JSON root is not an array and has no `transactions` array'],
      };
    }
  } else {
    return { type: 'json', transactions: [], warnings: ['JSON root is not an array'] };
  }
  const warnings: string[] = [];
  if (envelopeNote) warnings.push(envelopeNote);
  const transactions: Array<Omit<Transaction, 'id' | 'accountId'>> = [];
  rows.forEach((row, idx) => {
    if (typeof row !== 'object' || row === null) {
      warnings.push(`row ${idx}: not an object; skipped`);
      return;
    }
    const tx = coerceRow(row as Record<string, unknown>, warnings, idx);
    if (tx) transactions.push(tx);
  });
  return { type: 'json', transactions, warnings };
}

async function parseXmlImpl(file: File): Promise<ParsedTransactions> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  const errorNode = doc.querySelector('parsererror');
  if (errorNode) {
    return { type: 'xml', transactions: [], warnings: ['malformed XML'] };
  }
  const transactionNodes = Array.from(doc.getElementsByTagName('transaction'));
  if (transactionNodes.length === 0) {
    return { type: 'xml', transactions: [], warnings: ['no <transaction> elements found'] };
  }
  const warnings: string[] = [];
  const transactions: Array<Omit<Transaction, 'id' | 'accountId'>> = [];
  transactionNodes.forEach((node, idx) => {
    const raw: Record<string, unknown> = {};
    Array.from(node.children).forEach((child) => {
      raw[child.tagName] = child.textContent ?? '';
    });
    const tx = coerceRow(raw, warnings, idx);
    if (tx) transactions.push(tx);
  });
  return { type: 'xml', transactions, warnings };
}

async function readSheetRows(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
}

async function parseXlsxImpl(file: File): Promise<ParsedTransactions> {
  const rows = await readSheetRows(file);
  if (rows.length === 0) {
    return { type: 'xlsx', transactions: [], warnings: ['empty sheet'] };
  }
  const warnings: string[] = [];
  const transactions: Array<Omit<Transaction, 'id' | 'accountId'>> = [];
  rows.forEach((row, idx) => {
    const normalised: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      const mapped = mapHeader(k);
      if (mapped) normalised[mapped] = v;
    }
    const tx = coerceRow(normalised, warnings, idx);
    if (tx) transactions.push(tx);
  });
  return { type: 'xlsx', transactions, warnings };
}

async function parsePdfImpl(file: File): Promise<ParsedTransactions> {
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true });
  const doc = await loadingTask.promise;
  const lines: string[] = [];
  const warnings: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pageText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .forEach((l) => lines.push(l));
  }
  if (lines.length === 0) {
    warnings.push('PDF had no extractable text (possibly scanned/image-only)');
    return { type: 'pdf', transactions: [], warnings };
  }
  const transactions: Array<Omit<Transaction, 'id' | 'accountId'>> = [];
  const re = /(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})[^\n]*?(-?\$?\d{1,7}(?:[.,]\d{2}))/g;
  lines.forEach((line, idx) => {
    const m = re.exec(line);
    if (!m) return;
    const [, dateRaw, amountRaw] = m;
    let iso: string | null = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) iso = dateRaw;
    else {
      const parts = dateRaw.split('/');
      if (parts.length === 3) {
        const [mm, dd, yyyy] = parts;
        iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }
    }
    if (!iso) {
      warnings.push(`line ${idx}: invalid date; skipped`);
      return;
    }
    const numeric = Number(amountRaw.replace(/[^\d.,-]/g, '').replace(',', '.'));
    if (!Number.isFinite(numeric)) {
      warnings.push(`line ${idx}: invalid amount; skipped`);
      return;
    }
    const description = escapeFormula(line.replace(dateRaw, '').replace(amountRaw, '').trim() || 'PDF row');
    const tx = coerceRow(
      {
        date: iso,
        description,
        amount: Math.abs(numeric),
        category: 'Uncategorized',
        type: numeric < 0 ? 'income' : 'expense',
        status: 'confirmed',
      },
      warnings,
      idx,
    );
    if (tx) transactions.push(tx);
  });
  if (transactions.length === 0) {
    warnings.push('no date+amount rows detected in PDF text');
  }
  return { type: 'pdf', transactions, warnings };
}

async function parseImageImpl(
  file: File,
  config: LMStudioConfig | null,
): Promise<ParsedTransactions> {
  if (!config) {
    return { type: inferSupportedType(file) as SupportedType, transactions: [], warnings: ['AI config unavailable; cannot process image'] };
  }
  const { extractTransactions } = await import('./ai-extraction');
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const partials = await extractTransactions(base64, config);
  const warnings: string[] = [];
  const transactions: Array<Omit<Transaction, 'id' | 'accountId'>> = partials.map((p, idx) =>
    coerceRow(p as Record<string, unknown>, warnings, idx) ?? defaultTx(),
  );
  return { type: inferSupportedType(file) as SupportedType, transactions, warnings };
}

export async function parseFile(
  file: File,
  options?: { aiConfig?: LMStudioConfig | null },
): Promise<ParsedTransactions> {
  const type = inferSupportedType(file);
  if (!type) {
    return {
      type: 'csv',
      transactions: [],
      warnings: [`unsupported file type: ${file.type || file.name}`],
    };
  }
  if (isImage(type)) {
    return parseImageImpl(file, options?.aiConfig ?? null);
  }
  if (type === 'csv') return parseCsvImpl(file);
  if (type === 'json') return parseJsonImpl(file);
  if (type === 'xml') return parseXmlImpl(file);
  if (type === 'xls' || type === 'xlsx') return parseXlsxImpl(file);
  return parsePdfImpl(file);
}
