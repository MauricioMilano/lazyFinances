# Aether Finance (lazyFinances)

A privacy-first personal finance tracker that uses a local AI model (LM Studio) to extract transactions from receipt and statement images. Your data never leaves your machine.

## Features

- **Batch image upload** — select multiple receipts/statements at once and process them sequentially to keep the local AI stable.
- **AI-powered extraction** — transactions are parsed from images by a local vision model you bring yourself (BYOK).
- **Inline editing** — every field of every row is editable in-place; rows can be deleted on hover.
- **Reactive table** — the table grows progressively as each file finishes extracting, with a live progress ribbon in the header.
- **Persistent storage** — transactions, accounts, and config are stored in `localStorage` and restored on reload.
- **Manual entry** — add rows directly without uploading anything.

## Tech stack

- **React 19** + **TypeScript**
- **Vite 8** (dev server on port `8080`)
- **Tailwind CSS 3** + **shadcn/ui** (Radix primitives)
- **Zustand 5** for state management
- **Sonner** for toasts
- **LM Studio** as the local AI backend (OpenAI-compatible API)

## Prerequisites

- **Node.js 18+**
- **pnpm** (`npm install -g pnpm`)
- **LM Studio** running locally with:
  - The local server enabled (default: `http://localhost:1234/v1`)
  - A vision-capable model loaded (e.g. `llama-3.2-vision`)

## Installation

```bash
pnpm install
```

## Configuration

1. Open LM Studio and load a vision-capable model.
2. Start the local server (Developer → Start Server).
3. In the app, click the gear icon in the top-right to open **Settings**.
4. Confirm the **Base URL** (`http://localhost:1234/v1`), **API Key** (`lm-studio` by default), and **Model Name** match your LM Studio setup.
5. Click *Save changes*.

If the model list is empty, click the refresh icon next to the model selector to fetch available models from the server.

## Development

```bash
pnpm dev
```

The app runs at <http://localhost:8080>.

## Build

```bash
pnpm build
```

Outputs a production bundle to `dist/`.

## Preview production build

```bash
pnpm preview
```

## Lint

```bash
pnpm lint
```

## Project structure

```
src/
├── components/
│   ├── ui/                  # shadcn/ui primitives (do not edit)
│   ├── AirtableTable.tsx    # Editable transactions table
│   ├── ExtractionCard.tsx   # Multi-file upload + AI extraction
│   └── Settings.tsx         # LM Studio configuration dialog
├── hooks/
│   ├── use-finance.ts       # Thin selector hook over the finance store
│   └── use-ai-config.ts     # Thin selector hook over the AI config store
├── lib/
│   ├── defaults.ts          # DEFAULT_ACCOUNTS seed data
│   └── utils.ts             # `cn` helper for Tailwind
├── pages/
│   ├── Index.tsx            # Main dashboard
│   └── NotFound.tsx         # 404 page
├── store/
│   ├── finance.ts           # Zustand store: transactions, accounts, ephemeral upload state
│   └── ai-config.ts         # Zustand store: LM Studio configuration
├── types/
│   └── finance.ts           # Shared TypeScript types
├── utils/
│   └── ai-extraction.ts     # LM Studio API client
├── App.tsx
└── main.tsx
openspec/
├── changes/                 # Active and archived change proposals
└── specs/                   # Authoritative capability specs
```

## How it works

1. User selects one or more image files in **ExtractionCard**.
2. The finance store's upload lifecycle starts (`startProcessing`), exposing `isProcessing`, `current`, `total`, and `fileName` to any component.
3. Each file is read as a base64 data URL and sent to LM Studio (whose config is read from the AI config store) via the OpenAI-compatible `/chat/completions` endpoint.
4. Files are processed sequentially. As each file's transactions are extracted, they are committed to the finance store (`addTransactions`) so the table grows in real time.
5. **AirtableTable** subscribes to the same store and renders a header progress ribbon while `isProcessing` is true.
6. When the batch finishes, `endProcessing` resets the upload state (which is ephemeral and never persisted).

## State management

The app uses two independent Zustand stores:

| Store | Owns | Persistence key | Persistence |
|---|---|---|---|
| `useFinanceStore` | transactions, accounts, ephemeral upload state | `aether_finance_data` | data persisted; upload state excluded via `partialize` |
| `useAIConfigStore` | LM Studio config (`baseUrl`, `apiKey`, `model`) | `aether_ai_config` | entire store persisted |

A one-time migration copies any `config` previously saved under the old combined `aether_finance_data` key into the new `aether_ai_config` key on first load. After the first save through the new store, the old key is left untouched but ignored.

## License

Private project.
