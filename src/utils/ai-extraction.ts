import { LMStudioConfig, Transaction } from '../types/finance';

const SYSTEM_PROMPT = `You are a financial data extraction assistant. 
Extract transactions from the provided image of a bank statement or receipt.
Return ONLY a JSON array of objects with the following keys:
- date (ISO 8601 format YYYY-MM-DD)
- description (string)
- amount (number, positive for expenses, negative for income/refunds)
- category (string, best guess)
- type (string, 'expense' or 'income')

If you cannot extract data, return an empty array [].
Do not include any other text or explanation.`;

export async function extractTransactions(
  imageBase64: string,
  config: LMStudioConfig
): Promise<Partial<Transaction>[]> {
  const response = await fetch(config.baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract the transactions from this image.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`LM Studio API error: ${response.statusText}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;

  try {
    // Attempt to parse JSON from the content
    const jsonMatch = content.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse AI response', content);
    throw new Error('AI returned invalid JSON format');
  }
}

export async function fetchModels(config: LMStudioConfig): Promise<string[]> {
  try {
    const response = await fetch(config.baseUrl + '/models', {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch models');
    const data = await response.json();
    return data.data.map((m: any) => m.id);
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}
