import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inferSupportedType, isImage, parseFile } from '../file-parsers';

vi.mock('@/utils/ai-extraction', () => ({
  extractTransactions: vi.fn(),
  fetchModels: vi.fn(),
}));

const sampleCsv =
  'date,description,amount,category,type,status\r\n' +
  '2026-07-23,=SUM(A1:A2),10,Food,expense,confirmed\r\n' +
  '2026-07-24,+evil,20,Drink,income,pending\r\n' +
  '2026-07-25,-avoid csv injection,30,Travel,expense,confirmed\r\n' +
  '2026-07-26,@cmd,40,Other,expense,confirmed\r\n';

const sampleCsvOneLine = 'date,description,amount,category,type,status\n2026-07-23,Coffee,4.50,Food,expense,confirmed';

const sampleJson =
  '[\n' +
  '  {"date":"2026-07-23","description":"Coffee","amount":4.5,"category":"Food","type":"expense","status":"confirmed"}\n' +
  ']';

const sampleXml =
  '<transactions>' +
  '<transaction><date>2026-07-23</date><description>Coffee</description><amount>4.5</amount><category>Food</category><type>expense</type><status>confirmed</status></transaction>' +
  '</transactions>';

function makeFile(name: string, type: string, body: string): File {
  return new File([body], name, { type });
}

describe('inferSupportedType', () => {
  it('maps common MIME types', () => {
    expect(inferSupportedType(makeFile('a.png', 'image/png', ''))).toBe('png');
    expect(inferSupportedType(makeFile('a.jpg', 'image/jpeg', ''))).toBe('jpeg');
    expect(inferSupportedType(makeFile('a.pdf', 'application/pdf', ''))).toBe('pdf');
    expect(inferSupportedType(makeFile('a.csv', 'text/csv', ''))).toBe('csv');
    expect(inferSupportedType(makeFile('a.json', 'application/json', ''))).toBe('json');
  });

  it('falls back to extension when MIME is missing', () => {
    expect(inferSupportedType(makeFile('a.csv', '', ''))).toBe('csv');
    expect(inferSupportedType(makeFile('a.XLSX', '', ''))).toBe('xlsx');
  });

  it('returns null for unsupported types', () => {
    expect(inferSupportedType(makeFile('a.exe', '', ''))).toBeNull();
    expect(inferSupportedType(makeFile('a.zip', 'application/zip', ''))).toBeNull();
  });
});

describe('isImage', () => {
  it('returns true for image families only', () => {
    expect(isImage('png')).toBe(true);
    expect(isImage('pdf')).toBe(false);
  });
});

describe('parseFile — csv', () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date('2026-07-23T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses headers and rows', async () => {
    const result = await parseFile(makeFile('a.csv', 'text/csv', sampleCsv));
    expect(result.type).toBe('csv');
    expect(result.transactions.length).toBe(4);
    expect(result.transactions[0].date).toBe('2026-07-23');
    expect(result.transactions[0].amount).toBe(10);
  });

  it('escapes formula prefix on string cells', async () => {
    const result = await parseFile(makeFile('a.csv', 'text/csv', sampleCsv));
    expect(result.transactions[0].description.startsWith("'")).toBe(true);
    expect(result.transactions[1].description.startsWith("'")).toBe(true);
    expect(result.transactions[2].description.startsWith("'")).toBe(true);
    expect(result.transactions[3].description.startsWith("'")).toBe(true);
  });

  it('handles a single-row CSV without trailing newline', async () => {
    const result = await parseFile(makeFile('a.csv', 'text/csv', sampleCsvOneLine));
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description).toBe('Coffee');
  });

  it('skips rows with invalid amounts and reports warnings', async () => {
    const csv = 'date,description,amount\n2026-07-23,Bad,not-a-number';
    const result = await parseFile(makeFile('a.csv', 'text/csv', csv));
    expect(result.transactions).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('amount'))).toBe(true);
  });
});

describe('parseFile — json', () => {
  it('parses an array of transaction objects', async () => {
    const result = await parseFile(makeFile('a.json', 'application/json', sampleJson));
    expect(result.type).toBe('json');
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description).toBe('Coffee');
  });

  it('returns a warning for malformed JSON', async () => {
    const result = await parseFile(makeFile('a.json', 'application/json', '{ not json'));
    expect(result.transactions).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('returns a warning when root is not an array', async () => {
    const result = await parseFile(makeFile('a.json', 'application/json', '{"foo":1}'));
    expect(result.warnings[0]).toContain('not an array');
  });

  it('accepts the export envelope (object with `transactions`) produced by toJSON', async () => {
    const envelope = JSON.stringify({
      schemaVersion: 1,
      exportedAt: '2026-07-26T00:00:00.000Z',
      source: 'lazy-finance',
      count: 1,
      transactions: [
        {
          id: 'tx-1',
          date: '2026-07-23',
          description: 'Coffee',
          amount: 4.5,
          category: 'Food',
          accountId: '1',
          type: 'expense',
          status: 'confirmed',
        },
      ],
    });
    const result = await parseFile(makeFile('a.json', 'application/json', envelope));
    expect(result.type).toBe('json');
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description).toBe('Coffee');
    expect(result.warnings.some((w) => w.toLowerCase().includes('envelope'))).toBe(true);
  });
});

describe('parseFile — xml', () => {
  it('parses <transaction> children', async () => {
    const result = await parseFile(makeFile('a.xml', 'application/xml', sampleXml));
    expect(result.type).toBe('xml');
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description).toBe('Coffee');
  });

  it('reports malformed XML', async () => {
    const result = await parseFile(makeFile('a.xml', 'application/xml', '<not closed'));
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.transactions).toHaveLength(0);
  });

  it('returns warning when no <transaction> elements', async () => {
    const result = await parseFile(makeFile('a.xml', 'application/xml', '<root/>'));
    expect(result.warnings[0]).toContain('no <transaction>');
  });
});
