import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractTransactions, fetchModels } from '../ai-extraction';
import type { LMStudioConfig } from '@/types/finance';

const config: LMStudioConfig = {
  baseUrl: 'http://localhost:1234/v1',
  apiKey: 'lm-studio',
  model: 'llama-3.2-vision',
};

const fakeImage = 'data:image/png;base64,iVBORw0KGgo=';

const mockFetch = (response: unknown, init: { ok?: boolean; statusText?: string } = {}) => {
  const ok = init.ok ?? true;
  const statusText = init.statusText ?? 'OK';
  return vi.fn(async () => ({
    ok,
    statusText,
    json: async () => response,
  })) as unknown as typeof fetch;
};

describe('extractTransactions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses a bare JSON array response', async () => {
    const body = {
      choices: [
        { message: { content: JSON.stringify([{ date: '2026-07-23', amount: 10 }]) } },
      ],
    };
    globalThis.fetch = mockFetch(body);

    const result = await extractTransactions(fakeImage, config);
    expect(result).toEqual([{ date: '2026-07-23', amount: 10 }]);
  });

  it('extracts a JSON array embedded in a fenced code block', async () => {
    const fenced =
      '```json\n[{ "date": "2026-07-22", "amount": 4.5, "description": "Coffee" }]\n```';
    const body = { choices: [{ message: { content: fenced } }] };
    globalThis.fetch = mockFetch(body);

    const result = await extractTransactions(fakeImage, config);
    expect(result).toEqual([
      { date: '2026-07-22', amount: 4.5, description: 'Coffee' },
    ]);
  });

  it('extracts a JSON array when the model wraps it in surrounding prose', async () => {
    const wrapped =
      'Here you go:\n[{ "date": "2026-07-22", "amount": 4.5 }]\nHope this helps!';
    const body = { choices: [{ message: { content: wrapped } }] };
    globalThis.fetch = mockFetch(body);

    const result = await extractTransactions(fakeImage, config);
    expect(result).toEqual([{ date: '2026-07-22', amount: 4.5 }]);
  });

  it('returns an empty array on a non-JSON body', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const body = { choices: [{ message: { content: 'no json here' } }] };
    globalThis.fetch = mockFetch(body);

    await expect(extractTransactions(fakeImage, config)).rejects.toThrow(
      /invalid JSON/i
    );
    expect(err).toHaveBeenCalled();
  });

  it('throws when the HTTP response is not ok', async () => {
    globalThis.fetch = mockFetch({}, { ok: false, statusText: 'Internal Server Error' });

    await expect(extractTransactions(fakeImage, config)).rejects.toThrow(
      /Internal Server Error/
    );
  });

  it('sends the request to config.baseUrl + /chat/completions', async () => {
    const fetchMock = mockFetch({
      choices: [{ message: { content: '[]' } }],
    });
    globalThis.fetch = fetchMock;

    await extractTransactions(fakeImage, { ...config, baseUrl: 'http://h:1/v9' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://h:1/v9/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer lm-studio',
        }),
      })
    );
  });
});

describe('fetchModels', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('maps data.data[].id to a string list on success', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      }),
    })) as unknown as typeof fetch;

    const result = await fetchModels(config);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('returns [] on failure (does not throw)', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const result = await fetchModels(config);
    expect(result).toEqual([]);
    expect(err).toHaveBeenCalled();
  });

  it('returns [] on network error', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const result = await fetchModels(config);
    expect(result).toEqual([]);
    expect(err).toHaveBeenCalled();
  });
});
