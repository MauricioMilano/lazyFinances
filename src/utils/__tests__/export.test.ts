import { describe, expect, it } from 'vitest';
import { toCSV, toJSON, toXML, localDateStamp } from '../export';
import type { Transaction } from '@/types/finance';

const baseTx: Transaction = {
  id: 'tx-1',
  date: '2026-07-23',
  description: 'Coffee',
  amount: 4.5,
  category: 'Food',
  accountId: '1',
  type: 'expense',
  status: 'confirmed',
};

describe('toJSON', () => {
  it('produces an envelope with exactly the documented fields', () => {
    const out = JSON.parse(toJSON([baseTx]));
    expect(Object.keys(out).sort()).toEqual(
      ['count', 'exportedAt', 'schemaVersion', 'source', 'transactions']
    );
  });

  it('uses schemaVersion 1, source "lazy-finance", count == transactions.length', () => {
    const out = JSON.parse(toJSON([baseTx, { ...baseTx, id: 'tx-2' }]));
    expect(out.schemaVersion).toBe(1);
    expect(out.source).toBe('lazy-finance');
    expect(out.count).toBe(2);
    expect(out.transactions).toHaveLength(2);
  });

  it('preserves all eight transaction fields', () => {
    const out = JSON.parse(toJSON([baseTx]));
    const t = out.transactions[0];
    expect(Object.keys(t).sort()).toEqual(
      ['accountId', 'amount', 'category', 'date', 'description', 'id', 'status', 'type']
    );
  });

  it('does not sign-flip amounts (lossless)', () => {
    const expense: Transaction = { ...baseTx, amount: 5.25, type: 'expense' };
    const out = JSON.parse(toJSON([expense]));
    expect(out.transactions[0].amount).toBe(5.25);
    expect(out.transactions[0].type).toBe('expense');
  });
});

describe('toCSV', () => {
  it('begins with a UTF-8 BOM', () => {
    const out = toCSV([baseTx]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
  });

  it('uses the documented header row', () => {
    const out = toCSV([baseTx]).replace(/^\ufeff/, '');
    expect(out.split('\r\n')[0]).toBe(
      'id,date,description,amount,category,account_id,type,status'
    );
  });

  it('uses CRLF line endings', () => {
    const out = toCSV([baseTx]).replace(/^\ufeff/, '');
    const lines = out.split('\r\n');
    expect(lines.length).toBeGreaterThanOrEqual(2);
    // Body line + trailing empty
    expect(out.endsWith('\r\n')).toBe(true);
  });

  it('quotes fields containing commas', () => {
    const out = toCSV([{ ...baseTx, description: 'Coffee, latte' }]).replace(/^\ufeff/, '');
    const body = out.split('\r\n')[1];
    expect(body).toContain('"Coffee, latte"');
  });

  it('quotes and doubles embedded double-quotes', () => {
    const out = toCSV([{ ...baseTx, description: 'She said "hi"' }]).replace(/^\ufeff/, '');
    const body = out.split('\r\n')[1];
    expect(body).toContain('"She said ""hi"""');
  });

  it('quotes fields containing newlines', () => {
    const out = toCSV([{ ...baseTx, description: 'line1\nline2' }]).replace(/^\ufeff/, '');
    const body = out.split('\r\n')[1];
    expect(body).toContain('"line1\nline2"');
  });

  it('uses account_id column for the accountId field', () => {
    const out = toCSV([baseTx]).replace(/^\ufeff/, '');
    const header = out.split('\r\n')[0];
    expect(header).toContain('account_id');
  });
});

describe('toXML', () => {
  it('starts with an XML declaration', () => {
    const out = toXML([baseTx]);
    expect(out.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('has a single root <export> with the documented attributes', () => {
    const out = toXML([baseTx]);
    const match = out.match(/<export ([^>]+)>/);
    expect(match).toBeTruthy();
    const attrs = match![1];
    expect(attrs).toMatch(/schemaVersion="1"/);
    expect(attrs).toMatch(/source="lazy-finance"/);
    expect(attrs).toMatch(/count="1"/);
    expect(attrs).toMatch(/exportedAt="[^"]+"/);
  });

  it('emits one <transaction> per stored transaction with all eight fields as attributes', () => {
    const out = toXML([baseTx]);
    expect(out.match(/<transaction /g)).toHaveLength(1);
    const t = out.match(/<transaction [^>]+/)?.[0] ?? '';
    for (const field of ['id', 'date', 'description', 'amount', 'category', 'accountId', 'type', 'status']) {
      expect(t).toContain(`${field}=`);
    }
  });

  it('escapes <, >, & in attribute values', () => {
    const out = toXML([{ ...baseTx, description: 'a < b & c > d' }]);
    expect(out).toContain('a &lt; b &amp; c &gt; d');
    expect(out).not.toContain('a < b & c > d');
  });
});

describe('localDateStamp', () => {
  it('formats a Date as YYYY-MM-DD in local time', () => {
    const d = new Date(2026, 6, 23); // 23 July 2026 local
    expect(localDateStamp(d)).toBe('2026-07-23');
  });

  it('zero-pads single-digit month and day', () => {
    const d = new Date(2026, 0, 5); // 5 Jan 2026
    expect(localDateStamp(d)).toBe('2026-01-05');
  });
});
