import type {
  Formatter,
  NumericInput,
  DateInput,
  NumberOptions,
  CurrencyOptions,
  PercentageOptions,
  DurationOptions,
  DateOptions,
  DateTimeOptions,
} from "./core/types.js";

const toMockDateStr = (v: DateInput, fallback = "—"): string => {
  if (v == null) return fallback;
  try {
    if (typeof v === "boolean" || Array.isArray(v)) return fallback;
    const isUnixTimestamp = typeof v === "string" && /^-?\d+$/.test(v) && v.length >= 12;
    const parsedValue = isUnixTimestamp ? Number(v) : v;
    const d = new Date(parsedValue as any);
    return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
  } catch {
    return fallback;
  }
};

export const mockFormatter: Formatter = Object.freeze({
  number: (v: NumericInput, options?: NumberOptions) => {
    if (v == null || v === "" || typeof v === "boolean" || Array.isArray(v)) {
      return options?.fallback ?? "—";
    }
    return String(v);
  },
  currency: (v: NumericInput, options?: CurrencyOptions) => {
    if (v == null || v === "" || typeof v === "boolean" || Array.isArray(v)) {
      return options?.fallback ?? "—";
    }
    return `$${v}`;
  },
  percentage: (v: NumericInput, options?: PercentageOptions) => {
    if (v == null || v === "" || typeof v === "boolean" || Array.isArray(v)) {
      return options?.fallback ?? "—";
    }
    return `${v}%`;
  },
  duration: (v: NumericInput, options?: DurationOptions) => {
    if (v == null || v === "" || typeof v === "boolean" || Array.isArray(v)) {
      return options?.fallback ?? "—";
    }
    return `${v}s`;
  },
  date: (v: DateInput, options?: DateOptions) => {
    const s = toMockDateStr(v, options?.fallback ?? "—");
    return s === (options?.fallback ?? "—") ? s : (s.split("T")[0] ?? "—");
  },
  dateTime: (v: DateInput, options?: DateTimeOptions) => {
    return toMockDateStr(v, options?.fallback ?? "—");
  },
  relativeTime: (v: DateInput, optionsOrNow?: any) => {
    let callFallback = "—";
    if (optionsOrNow && typeof optionsOrNow === "object") {
      callFallback = optionsOrNow.fallback ?? "—";
    }
    if (v == null || v === "") {
      return callFallback;
    }
    return "just now";
  },
});

export type { Formatter, FormatterConfig } from "./core/types.js";
