export type NumericInput = number | string | null | undefined;
export type DateInput = string | number | Date | null | undefined;

export type NumberOptions = Pick<
  Intl.NumberFormatOptions,
  | "notation"
  | "minimumFractionDigits"
  | "maximumFractionDigits"
  | "minimumSignificantDigits"
  | "maximumSignificantDigits"
  | "minimumIntegerDigits"
  | "useGrouping"
  | "signDisplay"
> & {
  /** Override global fallback string for this call */
  fallback?: string;
};

export type CurrencyOptions = NumberOptions & {
  currency?: string;
  currencyDisplay?: "symbol" | "narrowSymbol" | "code" | "name";
  currencySign?: "standard" | "accounting";
};

export type PercentageOptions = Pick<
  Intl.NumberFormatOptions,
  "minimumFractionDigits" | "maximumFractionDigits" | "minimumSignificantDigits" | "maximumSignificantDigits" | "signDisplay"
> & {
  /** "percent" (default): 50 → "50%". "fraction": 0.5 → "50%" */
  inputMode?: "percent" | "fraction";
  /** Override global fallback string for this call */
  fallback?: string;
};

export type DateOptions = Intl.DateTimeFormatOptions & {
  /** Override global fallback string for this call */
  fallback?: string;
};

export type DateTimeOptions = Intl.DateTimeFormatOptions & {
  /** Override global fallback string for this call */
  fallback?: string;
};

export type PluralForm = string | {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

export type DurationLabels = {
  h?: string;
  m?: string;
  s?: string;
  hour?: PluralForm;
  minute?: PluralForm;
  second?: PluralForm;
};

export type DurationOptions = {
  /**
   * "compact" (default): produces compact output like "2m 30s" or "1h 0m".
   * "verbose": produces spelled-out output like "1 hour, 1 minute, 1 second".
   */
  format?: "compact" | "verbose";
  /** Override global fallback string for this call */
  fallback?: string;
  /** Custom localization labels for durations */
  labels?: DurationLabels;
  /** Number of decimal places for seconds. Default: 0 */
  fractionalDigits?: number;
};

export type RelativeTimeOptions = {
  /** The format style. Default: "long" */
  style?: "long" | "short" | "narrow";
  /** The numeric values display format. Default: "auto" */
  numeric?: "always" | "auto";
  /** Override global fallback string for this call */
  fallback?: string;
};

export type FormatterRules = {
  /** Numbers >= this use compact notation (1.2K, 3.4M). Default: 10000 */
  compactThreshold?: number;
  /** Minimum fraction digits for number, currency, percentage. Default: 0 */
  minimumFractionDigits?: number;
  /** Maximum fraction digits for number, currency, percentage. Default: 2 */
  maximumFractionDigits?: number;
  /** Default currency display style. Default: "narrowSymbol" */
  currencyDisplay?: "symbol" | "narrowSymbol" | "code" | "name";
  /** Default date format options */
  dateFormat?: Intl.DateTimeFormatOptions;
  /** Default dateTime format options */
  dateTimeFormat?: Intl.DateTimeFormatOptions;
  /** Default number format options — merged with per-call overrides */
  numberFormat?: NumberOptions;
  /** Default currency format options — merged with per-call overrides */
  currencyFormat?: CurrencyOptions;
  /** Default relativeTime format options */
  relativeTimeFormat?: RelativeTimeOptions;

  /** Specialized Default Fallbacks */
  fallback?: string;
  numberFallback?: string;
  currencyFallback?: string;
  percentageFallback?: string;
  durationFallback?: string;
  dateFallback?: string;
  dateTimeFallback?: string;
  relativeTimeFallback?: string;
};

export type FormatterConfig = {
  locale?: string;
  currency?: string;
  fallback?: string;
  rules?: FormatterRules;
};

export interface Formatter {
  /**
   * Format a plain number. Uses compact notation above compactThreshold.
   * @example
   * fmt.number(1234567)                              // "1.2M"
   * fmt.number(1234, { notation: "standard" })       // "1,234"
   * fmt.number(1.5678, { maximumFractionDigits: 1 }) // "1.6"
   */
  number(value: NumericInput, options?: NumberOptions): string;

  /**
   * Format a currency value. Uses compact notation above compactThreshold.
   * @example
   * fmt.currency(49900)                                // "$49.9K"
   * fmt.currency(1234, { currency: "EUR" })            // "€1,234"
   * fmt.currency(1234, { currencyDisplay: "code" })    // "USD 1,234"
   * fmt.currency(1234, { minimumFractionDigits: 2 })   // "$1,234.00"
   */
  currency(value: NumericInput, options?: CurrencyOptions): string;

  /**
   * Format a percentage. Input treated as raw percentage by default (50 → "50%").
   * For values that round to zero, uses significantDigits to preserve precision.
   * @example
   * fmt.percentage(12.5)                              // "12.5%"
   * fmt.percentage(0.001)                             // "0.001%"
   * fmt.percentage(0.5, { inputMode: "fraction" })    // "50%"
   * fmt.percentage(12.5, { maximumFractionDigits: 0 }) // "13%"
   */
  percentage(value: NumericInput, options?: PercentageOptions): string;

  /**
   * Format a duration in seconds. Pure math — no Intl, no ICU risk.
   * Output is always in English by default, but customizable via labels.
   * Negative values are supported and produce a leading "-" sign.
   * @example
   * fmt.duration(150)                        // "2m 30s"
   * fmt.duration(3661, { format: "verbose" }) // "1 hour, 1 minute, 1 second"
   * fmt.duration(-90)                         // "-1m 30s"
   */
  duration(value: NumericInput, options?: DurationOptions): string;

  /**
   * Format a Date or ISO string as a human-readable date.
   * @example
   * fmt.date("2024-01-15")                         // "Jan 15, 2024"
   * fmt.date("2024-01-15", { dateStyle: "full" })  // "Monday, January 15, 2024"
   */
  date(value: DateInput, options?: DateOptions): string;

  /**
   * Format a Date or ISO string as a human-readable date and time.
   * @example
   * fmt.dateTime("2024-01-15T14:30:00") // "Jan 15, 2024, 2:30 PM"
   */
  dateTime(value: DateInput, options?: DateTimeOptions): string;

  /**
   * Format a Date or ISO string as relative time.
   * `now` defaults to `Date.now()` at call time. In Server Components, always pass
   * a fixed timestamp to prevent SSR/client hydration clock drift.
   * Supports an options object for custom styling or a backward-compatible timestamp.
   * @example
   * const now = Date.now(); // capture once per request
   * fmt.relativeTime("2024-01-15T10:00:00Z", { now }) // "2 hours ago"
   * fmt.relativeTime("2024-01-15T10:00:00Z", { now, style: "short" }) // "2 hr. ago"
   * fmt.relativeTime(new Date())                       // "just now"
   */
  relativeTime(
    value: DateInput,
    optionsOrNow?: (RelativeTimeOptions & { now?: number }) | number
  ): string;
}
