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
  second: { one: "second", other: "seconds" },
};

const MAX_CACHE_SIZE = 1000;

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>();
const pluralRulesFormatters = new Map<string, Intl.PluralRules>();

const DIGITS_ONLY_REGEX = /^-?\d+$/;
const CALENDAR_DATE_REGEX = /^(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?:[01]\d|2[0-3])?$/;
const SPACE_NORMALIZATION_REGEX = /[\u202f\u00a0]/g;
const ENGLISH_SUFFIX_REGEX = /(\d)\s*([kKmMbBtT])\b/g;
const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;
const ESCAPE_REGEX = /[\\|:,]/;
const ESCAPE_REGEX_GLOBAL = /[\\|:,]/g;

function serializeOptions(locale: string, opts: Record<string, unknown>): string {
  const keys = Object.keys(opts);
  if (keys.length === 0) return locale;
  keys.sort();
  let result = locale;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]!;
    const v = opts[k];
    if (v === undefined) continue;
    const strV = String(v);
    const safeK = ESCAPE_REGEX.test(k) ? k.replace(ESCAPE_REGEX_GLOBAL, "\\$&") : k;
    const safeV = ESCAPE_REGEX.test(strV) ? strV.replace(ESCAPE_REGEX_GLOBAL, "\\$&") : strV;
    result += `|${safeK}:${safeV}`;
  }
  return result;
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

function toNumber(value: NumericInput): number | null {
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  if (value == null || value === "") return null;
  try {
    if (typeof value === "boolean") return null;
    if (Array.isArray(value)) return null;
    const n = Number(value);
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
      const isDigitsOnly = DIGITS_ONLY_REGEX.test(value);
      const isCalendarDate = CALENDAR_DATE_REGEX.test(value);
      if (isDigitsOnly && value.length === 10 && !isCalendarDate) {
        const d = new Date(Number(value) * 1000);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      if (isDigitsOnly && value.length >= 12) {
        const d = new Date(Number(value));
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

function normalizeICU(str: string, localeStr: string): string {
  let hasSpace = false;
  let hasSpecialSpace = false;
  let hasLowercaseSuffix = false;
  const isEn = localeStr.startsWith("en");

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === " ") {
      hasSpace = true;
    } else if (char === "\u202f" || char === "\u00a0") {
      hasSpecialSpace = true;
    } else if (isEn && (char === "k" || char === "m" || char === "b" || char === "t")) {
      hasLowercaseSuffix = true;
    }
  }

  let normalized = str;
  if (hasSpecialSpace) {
    normalized = normalized.replace(SPACE_NORMALIZATION_REGEX, " ");
  }
  if (hasSpace || hasSpecialSpace) {
    normalized = normalized.trim();
  }
  if (hasLowercaseSuffix) {
    normalized = normalized.replace(ENGLISH_SUFFIX_REGEX, (_, p1, p2) => p1 + p2.toUpperCase());
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
    return v === 1 ? (form === "hours" ? "hour" : form === "minutes" ? "minute" : form === "seconds" ? "second" : form) : form;
  }
  const legacyForm = form as any;
  if (legacyForm.singular !== undefined || legacyForm.plural !== undefined) {
    return v === 1 ? (legacyForm.singular ?? legacyForm.other) : (legacyForm.plural ?? legacyForm.other);
  }
  const rulesInstance = getPluralRulesFormatter(localeStr, { type: "cardinal" });
  const category = rulesInstance.select(v);
  return form[category] ?? form.other;
}

function hasOverrides(opts: any): boolean {
  if (!opts) return false;
  for (const key in opts) {
    if (key !== "fallback" && opts[key] !== undefined) return true;
  }
  return false;
}

function hasCurrencyFormatOverrides(opts: any): boolean {
  if (!opts) return false;
  for (const key in opts) {
    if (key !== "currency" && key !== "fallback" && opts[key] !== undefined) return true;
  }
  return false;
}

export function createFormatter(config: FormatterConfig = {}): Formatter {
  const locale = config.locale ?? "en-US";
  let defaultCurrency = config.currency ?? "USD";
  if (typeof defaultCurrency === "string") {
    defaultCurrency = defaultCurrency.toUpperCase();
    if (!CURRENCY_CODE_REGEX.test(defaultCurrency)) {
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

  const defaultNumberFallback = rules.numberFallback || rules.fallback || fallback;
  const defaultCurrencyFallback = rules.currencyFallback || rules.fallback || fallback;
  const defaultPercentageFallback = rules.percentageFallback || rules.fallback || fallback;
  const defaultDurationFallback = rules.durationFallback || rules.fallback || fallback;
  const defaultDateFallback = rules.dateFallback || rules.fallback || fallback;
  const defaultDateTimeFallback = rules.dateTimeFallback || rules.fallback || fallback;
  const defaultRelativeTimeFallback = rules.relativeTimeFallback || rules.fallback || fallback;

  function isLarge(n: number) {
    return Math.abs(n) >= rules.compactThreshold;
  }

  const defaultStandardNumberFormatter = getNumberFormatter(locale, {
    style: "decimal",
    notation: "standard",
    minimumFractionDigits: rules.minimumFractionDigits,
    maximumFractionDigits: rules.maximumFractionDigits,
    ...rules.numberFormat,
  });
  const defaultCompactNumberFormatter = getNumberFormatter(locale, {
    style: "decimal",
    notation: "compact",
    minimumFractionDigits: rules.minimumFractionDigits,
    maximumFractionDigits: rules.maximumFractionDigits,
    ...rules.numberFormat,
  });

  const defaultStandardCurrencyFormatter = getNumberFormatter(locale, {
    style: "currency",
    currency: defaultCurrency,
    notation: "standard",
    minimumFractionDigits: rules.minimumFractionDigits,
    maximumFractionDigits: rules.maximumFractionDigits,
    currencyDisplay: rules.currencyDisplay,
    ...rules.currencyFormat,
  });
  const defaultCompactCurrencyFormatter = getNumberFormatter(locale, {
    style: "currency",
    currency: defaultCurrency,
    notation: "compact",
    minimumFractionDigits: rules.minimumFractionDigits,
    maximumFractionDigits: rules.maximumFractionDigits,
    currencyDisplay: rules.currencyDisplay,
    ...rules.currencyFormat,
  });

  const defaultPercentageFormatter = getNumberFormatter(locale, {
    style: "percent",
    minimumFractionDigits: rules.minimumFractionDigits,
    maximumFractionDigits: rules.maximumFractionDigits,
  });

  const defaultDateFormatter = getDateTimeFormatter(locale, rules.dateFormat);
  const defaultDateTimeFormatter = getDateTimeFormatter(locale, rules.dateTimeFormat);

  const defaultRelativeTimeFormatter = getRelativeTimeFormatter(locale, {
    style: rules.relativeTimeFormat?.style ?? "long",
    numeric: rules.relativeTimeFormat?.numeric ?? "auto",
  });

  const localCurrencyFormatters = new Map<string, Intl.NumberFormat>();

  const formatters: Formatter = {
    number(value: NumericInput, options?: NumberOptions): string {
      const n = toNumber(value);
      if (options === undefined) {
        if (n == null) return defaultNumberFallback;
        return safeFormat(
          () => normalizeICU((isLarge(n) ? defaultCompactNumberFormatter : defaultStandardNumberFormatter).format(n), locale),
          defaultNumberFallback,
        );
      }

      const callFallback = options.fallback ?? defaultNumberFallback;
      if (n == null) return callFallback;

      if (!hasOverrides(options)) {
        return safeFormat(
          () => normalizeICU((isLarge(n) ? defaultCompactNumberFormatter : defaultStandardNumberFormatter).format(n), locale),
          callFallback,
        );
      }

      return safeFormat(() => {
        const { fallback: _, ...rest } = options;
        return normalizeICU(
          getNumberFormatter(locale, {
            style: "decimal",
            notation: isLarge(n) ? "compact" : "standard",
            minimumFractionDigits: rules.minimumFractionDigits,
            maximumFractionDigits: rules.maximumFractionDigits,
            ...rules.numberFormat,
            ...rest,
          }).format(n),
          locale,
        );
      }, callFallback);
    },

    currency(value: NumericInput, options?: CurrencyOptions): string {
      const n = toNumber(value);
      if (options === undefined) {
        if (n == null) return defaultCurrencyFallback;
        return safeFormat(
          () => normalizeICU((isLarge(n) ? defaultCompactCurrencyFormatter : defaultStandardCurrencyFormatter).format(n), locale),
          defaultCurrencyFallback,
        );
      }

      const callFallback = options.fallback ?? defaultCurrencyFallback;
      if (n == null) return callFallback;

      let finalCurrency = options.currency ?? defaultCurrency;
      if (typeof finalCurrency === "string") {
        finalCurrency = finalCurrency.toUpperCase();
        if (!CURRENCY_CODE_REGEX.test(finalCurrency)) {
          console.warn(
            `[intl-formatter] Invalid override currency code "${finalCurrency}". Falling back to default: "${defaultCurrency}".`,
          );
          finalCurrency = defaultCurrency;
        }
      }

      if (!hasCurrencyFormatOverrides(options)) {
        if (finalCurrency === defaultCurrency) {
          return safeFormat(
            () => normalizeICU((isLarge(n) ? defaultCompactCurrencyFormatter : defaultStandardCurrencyFormatter).format(n), locale),
            callFallback,
          );
        }
        return safeFormat(() => {
          const isComp = isLarge(n);
          const cacheKey = `${finalCurrency}-${isComp ? "compact" : "standard"}`;
          let formatter = localCurrencyFormatters.get(cacheKey);
          if (!formatter) {
            formatter = getNumberFormatter(locale, {
              style: "currency",
              currency: finalCurrency,
              notation: isComp ? "compact" : "standard",
              minimumFractionDigits: rules.minimumFractionDigits,
              maximumFractionDigits: rules.maximumFractionDigits,
              currencyDisplay: rules.currencyDisplay,
              ...rules.currencyFormat,
            });
            localCurrencyFormatters.set(cacheKey, formatter);
          }
          return normalizeICU(formatter.format(n), locale);
        }, callFallback);
      }

      return safeFormat(() => {
        const { currency: _, currencyDisplay, fallback: __, ...rest } = options;
        return normalizeICU(
          getNumberFormatter(locale, {
            style: "currency",
            currency: finalCurrency,
            notation: isLarge(n) ? "compact" : "standard",
            minimumFractionDigits: rules.minimumFractionDigits,
            maximumFractionDigits: rules.maximumFractionDigits,
            currencyDisplay: currencyDisplay ?? rules.currencyDisplay,
            ...rules.currencyFormat,
            ...rest,
          }).format(n),
          locale,
        );
      }, callFallback);
    },

    percentage(value: NumericInput, options?: PercentageOptions): string {
      const n = toNumber(value);
      if (options === undefined) {
        if (n == null) return defaultPercentageFallback;
        const normalized = n / 100;
        const wouldBeZero = Math.abs(normalized) > 0 && parseFloat(Math.abs(normalized).toFixed(rules.maximumFractionDigits + 2)) === 0;
        if (!wouldBeZero) {
          return safeFormat(() => normalizeICU(defaultPercentageFormatter.format(normalized), locale), defaultPercentageFallback);
        }
      }

      const callFallback = options?.fallback ?? defaultPercentageFallback;
      if (n == null) return callFallback;

      if (!hasOverrides(options)) {
        const normalized = n / 100;
        const wouldBeZero = Math.abs(normalized) > 0 && parseFloat(Math.abs(normalized).toFixed(rules.maximumFractionDigits + 2)) === 0;
        if (!wouldBeZero) {
          return safeFormat(() => normalizeICU(defaultPercentageFormatter.format(normalized), locale), callFallback);
        }
      }

      return safeFormat(() => {
        const inputMode = options?.inputMode;
        const normalized = inputMode === "fraction" ? n : n / 100;
        const checkMaxFraction = options?.maximumFractionDigits ?? rules.maximumFractionDigits;
        const wouldBeZero = Math.abs(normalized) > 0 && parseFloat(Math.abs(normalized).toFixed(checkMaxFraction + 2)) === 0;

        let intlOptions: any;
        if (options) {
          const { inputMode: _, fallback: __, ...rest } = options;
          intlOptions = rest;
        }

        return normalizeICU(
          getNumberFormatter(locale, {
            style: "percent",
            ...(wouldBeZero
              ? { maximumSignificantDigits: Math.max(checkMaxFraction, 4) }
              : {
                  minimumFractionDigits: rules.minimumFractionDigits,
                  maximumFractionDigits: rules.maximumFractionDigits,
                }),
            ...intlOptions,
          }).format(normalized),
          locale,
        );
      }, callFallback);
    },

    duration(value: NumericInput, options?: DurationOptions): string {
      const n = toNumber(value);
      const callFallback = options?.fallback ?? defaultDurationFallback;
      if (n == null) return callFallback;

      return safeFormat(() => {
        const absN = Math.abs(n);
        const fracDigits = options?.fractionalDigits ?? 0;
        const roundedAbsN = fracDigits > 0 ? Math.round(absN * Math.pow(10, fracDigits)) / Math.pow(10, fracDigits) : Math.round(absN);

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

        if (options?.format === "verbose") {
          const userHour = options.labels?.hour;
          const userMinute = options.labels?.minute;
          const userSecond = options.labels?.second;
          const labelHour = typeof userHour === "string" ? userHour : { ...DEFAULT_DURATION_LABELS.hour, ...userHour };
          const labelMinute = typeof userMinute === "string" ? userMinute : { ...DEFAULT_DURATION_LABELS.minute, ...userMinute };
          const labelSecond = typeof userSecond === "string" ? userSecond : { ...DEFAULT_DURATION_LABELS.second, ...userSecond };
          const parts: string[] = [];
          if (h) parts.push(`${h} ${resolvePluralLabel(h, labelHour, locale)}`);
          if (m) parts.push(`${m} ${resolvePluralLabel(m, labelMinute, locale)}`);
          if (sVal > 0 || fracDigits > 0 || !parts.length) {
            parts.push(`${s} ${resolvePluralLabel(sVal, labelSecond, locale)}`);
          }
          return sign + parts.join(", ");
        }

        const labelH = options?.labels?.h ?? DEFAULT_DURATION_LABELS.h;
        const labelM = options?.labels?.m ?? DEFAULT_DURATION_LABELS.m;
        const labelS = options?.labels?.s ?? DEFAULT_DURATION_LABELS.s;
        if (h > 0) return `${sign}${h}${labelH} ${m}${labelM}`;
        if (m > 0) return `${sign}${m}${labelM} ${s}${labelS}`;
        return `${sign}${s}${labelS}`;
      }, callFallback);
    },

    date(value: DateInput, options?: DateOptions): string {
      const date = toValidDate(value);
      if (options === undefined) {
        if (!date) return defaultDateFallback;
        return safeFormat(() => normalizeICU(defaultDateFormatter.format(date), locale), defaultDateFallback);
      }

      const callFallback = options.fallback ?? defaultDateFallback;
      if (!date) return callFallback;

      if (!hasOverrides(options)) {
        return safeFormat(() => normalizeICU(defaultDateFormatter.format(date), locale), callFallback);
      }

      return safeFormat(() => {
        const { fallback: _, ...rest } = options;
        return normalizeICU(getDateTimeFormatter(locale, rest).format(date), locale);
      }, callFallback);
    },

    dateTime(value: DateInput, options?: DateTimeOptions): string {
      const date = toValidDate(value);
      if (options === undefined) {
        if (!date) return defaultDateTimeFallback;
        return safeFormat(() => normalizeICU(defaultDateTimeFormatter.format(date), locale), defaultDateTimeFallback);
      }

      const callFallback = options.fallback ?? defaultDateTimeFallback;
      if (!date) return callFallback;

      if (!hasOverrides(options)) {
        return safeFormat(() => normalizeICU(defaultDateTimeFormatter.format(date), locale), callFallback);
      }

      return safeFormat(() => {
        const { fallback: _, ...rest } = options;
        return normalizeICU(getDateTimeFormatter(locale, rest).format(date), locale);
      }, callFallback);
    },

    relativeTime(value: DateInput, optionsOrNow?: (RelativeTimeOptions & { now?: number }) | number): string {
      const date = toValidDate(value);

      let now = Date.now();
      let hasRelativeOverrides = false;
      let callFallback = defaultRelativeTimeFallback;
      let opts: RelativeTimeOptions | undefined;

      if (typeof optionsOrNow === "number") {
        now = optionsOrNow;
      } else if (optionsOrNow !== undefined) {
        const { now: overrideNow, ...rest } = optionsOrNow;
        opts = rest;
        if (overrideNow !== undefined) now = overrideNow;
        hasRelativeOverrides = hasOverrides(opts);
        if (opts.fallback !== undefined) {
          callFallback = opts.fallback ?? defaultRelativeTimeFallback;
        }
      }

      if (!date) return callFallback;

      return safeFormat(() => {
        const diffSec = Math.round((date.getTime() - now) / 1000);
        const abs = Math.abs(diffSec);

        const rtfInstance =
          hasRelativeOverrides && opts
            ? getRelativeTimeFormatter(locale, {
                style: opts.style ?? rules.relativeTimeFormat?.style ?? "long",
                numeric: opts.numeric ?? rules.relativeTimeFormat?.numeric ?? "auto",
              })
            : defaultRelativeTimeFormatter;

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
                    formatted = rtfInstance.format(Math.round(day / 365), "year");
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
