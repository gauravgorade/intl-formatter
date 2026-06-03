## intl-formatter

[![npm version](https://img.shields.io/npm/v/intl-formatter)](https://www.npmjs.com/package/intl-formatter)
[![License](https://img.shields.io/github/license/gauravgorade/intl-formatter)](https://github.com/gauravgorade/intl-formatter/blob/main/LICENSE)
[![Bundlephobia](https://img.shields.io/bundlephobia/minzip/intl-formatter)](https://bundlephobia.com/package/intl-formatter)

[Performance](#performance)


Zero-dependency, isomorphic Intl formatting library for JavaScript and TypeScript. Seven synchronous, crash-safe methods for numbers, currency, percentages, durations, dates, and relative time. Identical output on server and client with no hydration mismatches, no framework lock-in, and built-in LRU caching of Intl instances. Under 3KB gzipped.

Works in Node.js, React, Next.js App Router, Express, Bun, Deno, and edge runtimes.

### Installation

```bash
npm install intl-formatter
yarn add intl-formatter
pnpm add intl-formatter
bun add intl-formatter
```

### Quick Start

Call `createFormatter` once and import the instance wherever you need it.

```typescript
import { createFormatter } from "intl-formatter";

const fmt = createFormatter({
  locale: "en-US",
  currency: "USD",
  rules: {
    compactThreshold: 10000,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
});

fmt.number(1500000);   // "1.5M"
fmt.currency(49.9);    // "$49.9"
fmt.percentage(12.5);  // "12.5%"
fmt.duration(5400);    // "1h 30m"
fmt.date(new Date());  // "Jan 15, 2024"
fmt.relativeTime(new Date(Date.now() - 60000)); // "1 minute ago"
```

### API

All methods are synchronous and crash-safe. Invalid inputs return the configured `fallback` value, which defaults to `"—"`.

| Method | Signature | Output |
| :--- | :--- | :--- |
| `number` | `number(value, options?)` | `"10.5K"` |
| `currency` | `currency(value, options?)` | `"$49.9K"` |
| `percentage` | `percentage(value, options?)` | `"12.5%"` |
| `duration` | `duration(value, options?)` | `"2m 30s"` |
| `date` | `date(value, options?)` | `"Jan 15, 2024"` |
| `dateTime` | `dateTime(value, options?)` | `"Jan 15, 2024, 2:30 PM"` |
| `relativeTime` | `relativeTime(value, now?)` | `"3 minutes ago"` |


### Node.js / Express / Bun / Deno

```javascript
import { createFormatter } from "intl-formatter";

const fmt = createFormatter({ locale: "de-DE", currency: "EUR" });

fmt.number(12500);    // "12,5K"
fmt.currency(99.90);  // "99,90 €"
```

### React

Define the config outside the component so the reference stays stable across renders.

```tsx
import { createFormatter } from "intl-formatter";

const fmt = createFormatter({ locale: "en-US", currency: "USD" });

export function Price({ amount }: { amount: number }) {
  return <span>{fmt.currency(amount)}</span>;
}
```

For apps that need the formatter available across the component tree, copy this provider and hook into your project.

**`lib/formatter-provider.tsx`**

```tsx
"use client";

import React, { createContext, useContext, useMemo } from "react";
import { createFormatter } from "intl-formatter";
import type { Formatter, FormatterConfig } from "intl-formatter";

const FormatterContext = createContext<Formatter | null>(null);

export function FormatterProvider({
  config,
  children,
}: {
  config: FormatterConfig;
  children: React.ReactNode;
}) {
  const formatter = useMemo(
    () => createFormatter(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.locale, config.currency, JSON.stringify(config.rules)]
  );
  return (
    <FormatterContext.Provider value={formatter}>
      {children}
    </FormatterContext.Provider>
  );
}

export function useFormatter() {
  const ctx = useContext(FormatterContext);
  if (!ctx) throw new Error("useFormatter must be used within a FormatterProvider");
  return ctx;
}
```

**`src/main.tsx`**

```tsx
import { FormatterProvider } from "@/lib/formatter-provider";

const formatterConfig = { locale: "en-US", currency: "USD" };

ReactDOM.createRoot(document.getElementById("root")!).render(
  <FormatterProvider config={formatterConfig}>
    <App />
  </FormatterProvider>
);
```

**In any component**

```tsx
import { useFormatter } from "@/lib/formatter-provider";

export function Price({ amount }: { amount: number }) {
  const fmt = useFormatter();
  return <span>{fmt.currency(amount)}</span>;
}
```

### Next.js App Router

Next.js requires separate handling for server and client. Server components call `getFormatter()` directly. Client components use `useFormatter()` from context. Both produce identical output.

**`lib/formatter/server.ts`**

```typescript
import { headers } from "next/headers";
import { createFormatter } from "intl-formatter";
import type { FormatterConfig } from "intl-formatter";

export async function getFormatterConfig(): Promise<FormatterConfig> {
  const headersList = await headers();
  const locale = headersList.get("accept-language")?.split(",")[0] ?? "en-US";
  return { locale, currency: "USD" };
}

export async function getFormatter() {
  return createFormatter(await getFormatterConfig());
}
```

> [!WARNING]
> Calling `headers()` opts the route out of static generation. If you need static pages, resolve locale via URL params (e.g. `/[locale]/page.tsx`) instead.

**`lib/formatter/client.tsx`**

```tsx
"use client";

import React, { createContext, useContext, useMemo } from "react";
import { createFormatter } from "intl-formatter";
import type { Formatter, FormatterConfig } from "intl-formatter";

const FormatterContext = createContext<Formatter | null>(null);

export function FormatterProvider({
  config,
  children,
}: {
  config: FormatterConfig;
  children: React.ReactNode;
}) {
  const formatter = useMemo(
    () => createFormatter(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.locale, config.currency, JSON.stringify(config.rules)]
  );
  return (
    <FormatterContext.Provider value={formatter}>
      {children}
    </FormatterContext.Provider>
  );
}

export function useFormatter() {
  const ctx = useContext(FormatterContext);
  if (!ctx) throw new Error("useFormatter must be used within a FormatterProvider");
  return ctx;
}
```

**`app/layout.tsx`**

```tsx
import { FormatterProvider } from "@/lib/formatter/client";
import { getFormatterConfig } from "@/lib/formatter/server";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getFormatterConfig();
  return (
    <html>
      <body>
        <FormatterProvider config={config}>{children}</FormatterProvider>
      </body>
    </html>
  );
}
```

**In any server component**

```tsx
import { getFormatter } from "@/lib/formatter/server";

export default async function PricingPage() {
  const fmt = await getFormatter();
  return <h1>Total: {fmt.currency(12500)}</h1>;
}
```

**In any client component**

```tsx
"use client";

import { useFormatter } from "@/lib/formatter/client";

export function Price({ amount }: { amount: number }) {
  const fmt = useFormatter();
  return <span>{fmt.currency(amount)}</span>;
}
```

### Next.js Pages Router

```tsx
import { FormatterProvider } from "@/lib/formatter/client";

const formatterConfig = { locale: "en-US", currency: "USD" };

export default function App({ Component, pageProps }) {
  return (
    <FormatterProvider config={formatterConfig}>
      <Component {...pageProps} />
    </FormatterProvider>
  );
}
```

### Advanced

### CLDR Pluralization Rules

For languages with complex plural rules such as Russian, Arabic, or Polish, pass a `PluralForm` object mapping Unicode CLDR categories (`one`, `few`, `many`, `two`, `zero`, `other`).

```typescript
const ruFmt = createFormatter({ locale: "ru-RU" });

ruFmt.duration(7200, {
  format: "verbose",
  labels: {
    hour: { one: "час", few: "часа", many: "часов", other: "часов" },
  },
}); // "2 часа"
```

### High-Precision Duration Decimals

```typescript
fmt.duration(1.543, { fractionalDigits: 2 }); // "1.54s"
```

### Specialized Fallback Hierarchies

```typescript
const fmt = createFormatter({
  rules: {
    numberFallback: "No Number",
    dateFallback: "No Date",
    fallback: "N/A",
  },
});

fmt.number(null);                           // "No Number"
fmt.percentage(null);                       // "N/A"
fmt.number(null, { fallback: "Override" }); // "Override"
```

### UNIX Timestamp Parsing

10-digit numeric strings are treated as second-based UNIX timestamps and multiplied by 1000. Strings of 12 or more digits are used as milliseconds directly.

```typescript
fmt.date("1705320000");    // "Jan 15, 2024"
fmt.date("1705320000000"); // "Jan 15, 2024"
```

### Types

```typescript
import type {
  Formatter,
  FormatterConfig,
  FormatterRules,
  NumericInput,
  DateInput,
  NumberOptions,
  CurrencyOptions,
  PercentageOptions,
  DurationOptions,
  DateOptions,
  DateTimeOptions,
} from "intl-formatter";
```

### Testing

`intl-formatter/testing` exports stable, non-localized mocks so snapshots do not break across environments.

```typescript
import { mockFormatter } from "intl-formatter/testing";

vi.mock("intl-formatter", () => ({
  createFormatter: () => mockFormatter,
}));
```

## Performance

Each benchmark call measures the full pipeline per call, including input validation, type coercion, compact threshold detection, override fast-path routing, LRU cache lookup, ICU output normalization, and fallback handling.

The following measurements are the average of 10 consecutive runs in the same process with 10,000 iterations per run in the Node.js v22 runtime.

| Formatter | ops/sec |
| :--- | :--- |
| number | 1,000,643 |
| currency | 992,891 |
| percentage | 620,193 |
| duration | 436,392 |
| date | 466,691 |
| dateTime | 369,985 |
| relativeTime | 609,472 |

### License

MIT © [gauravgorade](https://github.com/gauravgorade)

