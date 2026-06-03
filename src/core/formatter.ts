import type {
  FormatterConfig,
  FormatterRules,
  Formatter,
  NumericInput,
  DateInput,
  NumberOptions,
  CurrencyOptions,
  PercentageOptions,
  DurationOptions,
  RelativeTimeOptions,
  DateOptions,
  DateTimeOptions,
  PluralForm,
  DurationLabels,
} from "./types.js";

const DEFAULT_RULES: Required<FormatterRules> = {
  compactThreshold: 10000,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  currencyDisplay: "narrowSymbol",
  numberFormat: {},
  currencyFormat: {},
  relativeTimeFormat: { style: "long", numeric: "auto" },
  dateFormat: { year: "numeric", month: "short", day: "2-digit" },
  dateTimeFormat: {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  },
  fallback: "—",
  numberFallback: "",
  currencyFallback: "",
  percentageFallback: "",
  durationFallback: "",
  dateFallback: "",
  dateTimeFallback: "",
  relativeTimeFallback: "",
};

const DEFAULT_DURATION_LABELS = {
  h: "h",
  m: "m",
  s: "s",
  hour: { one: "hour", other: "hours" },
  minute: { one: "minute", other: "minutes" },
  second: { one: "second", other: "seconds" }
};

// ─── Module-Level High Performance Global Caches ──────────────────────────────
const MAX_CACHE_SIZE = 1000;

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>();
const pluralRulesFormatters = new Map<string, Intl.PluralRules>();

function serializeOptions(locale: string, opts: Record<string, unknown>): string {
  const keys = Object.keys(opts);
  if (keys.length === 0) return locale;
  keys.sort();
  let parts = [locale];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]!;
    const v = opts[k];
    if (v === undefined) continue;
    // escape backslashes, pipes, commas, and colons to prevent cache key collisions
    const safeK = k.replace(/[\\|:,]/g, '\\$&');
    const safeV = String(v).replace(/[\\|:,]/g, '\\$&');
    parts.push(`${safeK}:${safeV}`);
  }
  return parts.join("|");
}

function getNumberFormatter(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = serializeOptions(locale, options as Record<string, unknown>);
  if (numberFormatters.has(key)) {
    const entry = numberFormatters.get(key)!;
    numberFormatters.delete(key);
    numberFormatters.set(key, entry);
    return entry;
  }
  const formatter = new Intl.NumberFormat(locale, options);
  if (numberFormatters.size >= MAX_CACHE_SIZE) {
    const oldestKey = numberFormatters.keys().next().value;
    if (oldestKey !== undefined) numberFormatters.delete(oldestKey);
  }
  numberFormatters.set(key, formatter);
  return formatter;
}

function getDateTimeFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = serializeOptions(locale, options as Record<string, unknown>);
  if (dateTimeFormatters.has(key)) {
    const entry = dateTimeFormatters.get(key)!;
    dateTimeFormatters.delete(key);
    dateTimeFormatters.set(key, entry);
    return entry;
  }
  const formatter = new Intl.DateTimeFormat(locale, options);
  if (dateTimeFormatters.size >= MAX_CACHE_SIZE) {
    const oldestKey = dateTimeFormatters.keys().next().value;
    if (oldestKey !== undefined) dateTimeFormatters.delete(oldestKey);
  }
  dateTimeFormatters.set(key, formatter);
  return formatter;
}

function getRelativeTimeFormatter(locale: string, options: Intl.RelativeTimeFormatOptions): Intl.RelativeTimeFormat {
  const key = serializeOptions(locale, options as Record<string, unknown>);
  if (relativeTimeFormatters.has(key)) {
    const entry = relativeTimeFormatters.get(key)!;
    relativeTimeFormatters.delete(key);
    relativeTimeFormatters.set(key, entry);
    return entry;
  }
  const formatter = new Intl.RelativeTimeFormat(locale, options);
  if (relativeTimeFormatters.size >= MAX_CACHE_SIZE) {
    const oldestKey = relativeTimeFormatters.keys().next().value;
    if (oldestKey !== undefined) relativeTimeFormatters.delete(oldestKey);
  }
  relativeTimeFormatters.set(key, formatter);
  return formatter;
}

function getPluralRulesFormatter(locale: string, options: Intl.PluralRulesOptions): Intl.PluralRules {
  const key = serializeOptions(locale, options as Record<string, unknown>);
  if (pluralRulesFormatters.has(key)) {
    const entry = pluralRulesFormatters.get(key)!;
    pluralRulesFormatters.delete(key);
    pluralRulesFormatters.set(key, entry);
    return entry;
  }
  const rulesInstance = new Intl.PluralRules(locale, options);
  if (pluralRulesFormatters.size >= MAX_CACHE_SIZE) {
    const oldestKey = pluralRulesFormatters.keys().next().value;
    if (oldestKey !== undefined) pluralRulesFormatters.delete(oldestKey);
  }
  pluralRulesFormatters.set(key, rulesInstance);
  return rulesInstance;
}

export function createFormatter(config: FormatterConfig = {}): Formatter {
  const locale = config.locale ?? "en-US";
  let defaultCurrency = config.currency ?? "USD";
  if (typeof defaultCurrency === "string") {
    defaultCurrency = defaultCurrency.toUpperCase();
    if (!/^[A-Z]{3}$/.test(defaultCurrency)) {
      console.warn(`[intl-formatter] Invalid currency code "${defaultCurrency}". Falling back to "USD".`);
      defaultCurrency = "USD";
    }
  }
  const fallback = config.fallback ?? "—";
  const rules: Required<FormatterRules> = {
    ...DEFAULT_RULES,
    ...config.rules,
    numberFormat: { ...DEFAULT_RULES.numberFormat, ...config.rules?.numberFormat },
    currencyFormat: { ...DEFAULT_RULES.currencyFormat, ...config.rules?.currencyFormat },
    relativeTimeFormat: { ...DEFAULT_RULES.relativeTimeFormat, ...config.rules?.relativeTimeFormat },
    dateFormat: { ...DEFAULT_RULES.dateFormat, ...config.rules?.dateFormat },
    dateTimeFormat: { ...DEFAULT_RULES.dateTimeFormat, ...config.rules?.dateTimeFormat },
  };

  // Specialized Fallbacks Resolution
  const defaultNumberFallback = rules.numberFallback || rules.fallback || fallback;
  const defaultCurrencyFallback = rules.currencyFallback || rules.fallback || fallback;
  const defaultPercentageFallback = rules.percentageFallback || rules.fallback || fallback;
  const defaultDurationFallback = rules.durationFallback || rules.fallback || fallback;
  const defaultDateFallback = rules.dateFallback || rules.fallback || fallback;
  const defaultDateTimeFallback = rules.dateTimeFallback || rules.fallback || fallback;
  const defaultRelativeTimeFallback = rules.relativeTimeFallback || rules.fallback || fallback;

  function toNumber(value: NumericInput): number | null {
    if (value == null || value === "") return null;
    try {
      if (typeof value === "boolean") return null;
      if (Array.isArray(value)) return null;
      const n = typeof value === "number" ? value : Number(value);
      return Number.isNaN(n) ? null : n;
    } catch {
      return null;
    }
  }

  function toValidDate(value: DateInput): Date | null {
    if (value == null || value === "") return null;
    try {
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
      }
      if (typeof value === "number") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      if (typeof value === "string") {
        const isDigitsOnly = /^-?\d+$/.test(value);
        const isCalendarDate = /^(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?:[01]\d|2[0-3])?$/.test(value);
        if (isDigitsOnly && value.length === 10 && !isCalendarDate) {
          // Second UNIX timestamp: convert to milliseconds
          const parsedValue = Number(value) * 1000;
          const d = new Date(parsedValue);
          return Number.isNaN(d.getTime()) ? null : d;
        }
        if (isDigitsOnly && value.length >= 12) {
          // Millisecond UNIX timestamp
          const parsedValue = Number(value);
          const d = new Date(parsedValue);
          return Number.isNaN(d.getTime()) ? null : d;
        }
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      return null;
    } catch {
      return null;
    }
  }

  function isLarge(n: number) {
    return Math.abs(n) >= rules.compactThreshold;
  }

  function normalizeICU(str: string, localeStr: string): string {
    // Normalize both narrow no-break space and standard non-breaking space to regular space
    let normalized = str.replace(/[\u202f\u00a0]/g, " ").trim();
    // Only apply English-style compact suffix normalizer if locale is English to avoid breaking other languages
    if (localeStr.startsWith("en")) {
      normalized = normalized.replace(/(\d)\s*([kKmMbBtT])\b/g, (match, p1, p2) => p1 + p2.toUpperCase());
    }
    return normalized;
  }

  function safeFormat(formatterFn: () => string, fallbackValue: string): string {
    try {
      return formatterFn();
    } catch (err) {
      console.error(`[intl-formatter] Formatting failed. Returning fallback. Error:`, err);
      return fallbackValue;
    }
  }

  function resolvePluralLabel(v: number, form: PluralForm, localeStr: string): string {
    if (typeof form === "string") {
      // Singular/plural backwards fallback
      return v === 1 ? (form === "hours" ? "hour" : form === "minutes" ? "minute" : form === "seconds" ? "second" : form) : form;
    }
    // Backward compatibility for legacy option keys { singular, plural }
    const legacyForm = form as any;
    if (legacyForm.singular !== undefined || legacyForm.plural !== undefined) {
      return v === 1 ? (legacyForm.singular ?? legacyForm.other) : (legacyForm.plural ?? legacyForm.other);
    }
    const rulesInstance = getPluralRulesFormatter(localeStr, { type: "cardinal" });
    const category = rulesInstance.select(v);
    return form[category] ?? form.other;
  }

  const formatters: Formatter = {
    number(value: NumericInput, options: NumberOptions = {}): string {
      const n = toNumber(value);
      const callFallback = options.fallback ?? defaultNumberFallback;
      if (n == null) return callFallback;

      return safeFormat(() => {
        const { fallback: _, ...rest } = options;
        const resolvedOptions: Intl.NumberFormatOptions = {
          style: "decimal",
          notation: isLarge(n) ? "compact" : "standard",
          minimumFractionDigits: rules.minimumFractionDigits,
          maximumFractionDigits: rules.maximumFractionDigits,
          ...rules.numberFormat,
          ...rest,
        };
        return normalizeICU(
          getNumberFormatter(locale, resolvedOptions).format(n),
          locale
        );
      }, callFallback);
    },

    currency(value: NumericInput, options: CurrencyOptions = {}): string {
      const n = toNumber(value);
      const callFallback = options.fallback ?? defaultCurrencyFallback;
      if (n == null) return callFallback;

      return safeFormat(() => {
        const { currency: overrideCurrency, currencyDisplay, fallback: _, ...rest } = options;
        let finalCurrency = overrideCurrency ?? defaultCurrency;
        if (typeof finalCurrency === "string") {
          finalCurrency = finalCurrency.toUpperCase();
          if (!/^[A-Z]{3}$/.test(finalCurrency)) {
            console.warn(`[intl-formatter] Invalid override currency code "${finalCurrency}". Falling back to default: "${defaultCurrency}".`);
            finalCurrency = defaultCurrency;
          }
        }
        const resolvedOptions: Intl.NumberFormatOptions = {
          style: "currency",
          currency: finalCurrency,
          notation: isLarge(n) ? "compact" : "standard",
          minimumFractionDigits: rules.minimumFractionDigits,
          maximumFractionDigits: rules.maximumFractionDigits,
          currencyDisplay: currencyDisplay ?? rules.currencyDisplay,
          ...rules.currencyFormat,
          ...rest,
        };
        return normalizeICU(
          getNumberFormatter(locale, resolvedOptions).format(n),
          locale
        );
      }, callFallback);
    },

    percentage(value: NumericInput, options: PercentageOptions = {}): string {
      const n = toNumber(value);
      const callFallback = options.fallback ?? defaultPercentageFallback;
      if (n == null) return callFallback;

      return safeFormat(() => {
        const { inputMode, fallback: _, ...intlOptions } = options;
        const normalized = inputMode === "fraction" ? n : n / 100;

        const checkMaxFraction = intlOptions.maximumFractionDigits ?? rules.maximumFractionDigits;
        const wouldBeZero = Math.abs(normalized) > 0 && parseFloat(Math.abs(normalized).toFixed(checkMaxFraction + 2)) === 0;
        const sigDigits = Math.max(checkMaxFraction, 4);

        const resolvedOptions: Intl.NumberFormatOptions = {
          style: "percent",
          ...(wouldBeZero
            ? { maximumSignificantDigits: sigDigits }
            : {
              minimumFractionDigits: rules.minimumFractionDigits,
              maximumFractionDigits: rules.maximumFractionDigits,
            }),
          ...intlOptions,
        };
        return normalizeICU(
          getNumberFormatter(locale, resolvedOptions).format(normalized),
          locale
        );
      }, callFallback);
    },

    duration(value: NumericInput, options: DurationOptions = {}): string {
      const n = toNumber(value);
      const callFallback = options.fallback ?? defaultDurationFallback;
      if (n == null) return callFallback;

      return safeFormat(() => {
        const absN = Math.abs(n);
        const fracDigits = options.fractionalDigits ?? 0;

        const roundedAbsN = fracDigits > 0
          ? Math.round(absN * Math.pow(10, fracDigits)) / Math.pow(10, fracDigits)
          : Math.round(absN);

        const totalSec = Math.floor(roundedAbsN);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);

        let s: string;
        let sVal: number;
        if (fracDigits > 0) {
          sVal = roundedAbsN % 60;
          s = sVal.toFixed(fracDigits);
        } else {
          sVal = totalSec % 60;
          s = String(sVal);
        }

        const sign = n < 0 && absN >= 0.0001 ? "-" : "";

        const userHour = options.labels?.hour;
        const resolvedHour = typeof userHour === "string"
          ? userHour
          : { ...DEFAULT_DURATION_LABELS.hour, ...userHour };

        const userMinute = options.labels?.minute;
        const resolvedMinute = typeof userMinute === "string"
          ? userMinute
          : { ...DEFAULT_DURATION_LABELS.minute, ...userMinute };

        const userSecond = options.labels?.second;
        const resolvedSecond = typeof userSecond === "string"
          ? userSecond
          : { ...DEFAULT_DURATION_LABELS.second, ...userSecond };

        const labels = {
          h: options.labels?.h ?? DEFAULT_DURATION_LABELS.h,
          m: options.labels?.m ?? DEFAULT_DURATION_LABELS.m,
          s: options.labels?.s ?? DEFAULT_DURATION_LABELS.s,
          hour: resolvedHour,
          minute: resolvedMinute,
          second: resolvedSecond,
        } as Required<DurationLabels>;

        if (options.format === "verbose") {
          const parts: string[] = [];
          if (h) parts.push(`${h} ${resolvePluralLabel(h, labels.hour, locale)}`);
          if (m) parts.push(`${m} ${resolvePluralLabel(m, labels.minute, locale)}`);
          if (sVal > 0 || fracDigits > 0 || !parts.length) {
            parts.push(`${s} ${resolvePluralLabel(sVal, labels.second, locale)}`);
          }
          return sign + parts.join(", ");
        }
        if (h > 0) return `${sign}${h}${labels.h} ${m}${labels.m}`;
        if (m > 0) return `${sign}${m}${labels.m} ${s}${labels.s}`;
        return `${sign}${s}${labels.s}`;
      }, callFallback);
    },

    date(value: DateInput, options: DateOptions = {}): string {
      const date = toValidDate(value);
      const callFallback = options.fallback ?? defaultDateFallback;
      if (!date) return callFallback;

      return safeFormat(() => {
        const { fallback: _, ...rest } = options;
        const resolvedOptions: Intl.DateTimeFormatOptions = rest.dateStyle
          ? rest
          : { ...rules.dateFormat, ...rest };
        return normalizeICU(
          getDateTimeFormatter(locale, resolvedOptions).format(date),
          locale
        );
      }, callFallback);
    },

    dateTime(value: DateInput, options: DateTimeOptions = {}): string {
      const date = toValidDate(value);
      const callFallback = options.fallback ?? defaultDateTimeFallback;
      if (!date) return callFallback;

      return safeFormat(() => {
        const { fallback: _, ...rest } = options;
        const resolvedOptions: Intl.DateTimeFormatOptions =
          rest.dateStyle || rest.timeStyle
            ? rest
            : { ...rules.dateTimeFormat, ...rest };
        return normalizeICU(
          getDateTimeFormatter(locale, resolvedOptions).format(date),
          locale
        );
      }, callFallback);
    },

    relativeTime(
      value: DateInput,
      optionsOrNow?: (RelativeTimeOptions & { now?: number }) | number
    ): string {
      const date = toValidDate(value);

      let opts: RelativeTimeOptions = {};
      let now = Date.now();

      if (typeof optionsOrNow === "number") {
        now = optionsOrNow;
      } else if (optionsOrNow && typeof optionsOrNow === "object") {
        const { now: overrideNow, ...rest } = optionsOrNow;
        opts = rest;
        if (overrideNow !== undefined) {
          now = overrideNow;
        }
      }

      const callFallback = opts.fallback ?? defaultRelativeTimeFallback;
      if (!date) return callFallback;

      return safeFormat(() => {
        const diffSec = Math.round((date.getTime() - now) / 1000);
        const abs = Math.abs(diffSec);

        const resolvedOptions: Intl.RelativeTimeFormatOptions = {
          style: opts.style ?? rules.relativeTimeFormat?.style ?? "long",
          numeric: opts.numeric ?? rules.relativeTimeFormat?.numeric ?? "auto",
        };

        const rtfInstance = getRelativeTimeFormatter(locale, resolvedOptions);
        let formatted: string;

        if (abs < 60) {
          formatted = rtfInstance.format(diffSec, "second");
        } else {
          const min = Math.round(diffSec / 60);
          if (Math.abs(min) < 60) {
            formatted = rtfInstance.format(min, "minute");
          } else {
            const hr = Math.round(min / 60);
            if (Math.abs(hr) < 24) {
              formatted = rtfInstance.format(hr, "hour");
            } else {
              const day = Math.round(hr / 24);
              if (Math.abs(day) < 7) {
                formatted = rtfInstance.format(day, "day");
              } else {
                const week = Math.round(day / 7);
                if (Math.abs(week) < 4) {
                  formatted = rtfInstance.format(week, "week");
                } else {
                  const month = Math.round(day / 30);
                  if (Math.abs(month) < 12) {
                    formatted = rtfInstance.format(month, "month");
                  } else {
                    const year = Math.round(day / 365);
                    formatted = rtfInstance.format(year, "year");
                  }
                }
              }
            }
          }
        }
        return normalizeICU(formatted, locale);
      }, callFallback);
    },
  };

  return Object.freeze(formatters);
}
