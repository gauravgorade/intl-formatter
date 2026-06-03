import { describe, it, expect } from "vitest";
import { createFormatter } from "../src/index.js";

describe("next-formatter core features", () => {
  const fmt = createFormatter({
    locale: "en-US",
    currency: "USD",
    rules: {
      compactThreshold: 10000,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  });

  describe("number formatting", () => {
    it("formats standard numbers", () => {
      expect(fmt.number(1234.56)).toBe("1,234.56");
      expect(fmt.number(1234.5678, { maximumFractionDigits: 1 })).toBe("1,234.6");
      expect(fmt.number(0)).toBe("0");
    });

    it("formats compact numbers above threshold", () => {
      expect(fmt.number(12345)).toBe("12.35K");
      expect(fmt.number(1234567)).toBe("1.23M");
      // below threshold
      expect(fmt.number(9999)).toBe("9,999");
    });

    it("handles fallback and null/undefined/empty string", () => {
      expect(fmt.number(null)).toBe("—");
      expect(fmt.number(undefined)).toBe("—");
      expect(fmt.number("")).toBe("—");
      expect(fmt.number("invalid-number")).toBe("—");
    });
  });

  describe("currency formatting", () => {
    it("formats currency with standard options", () => {
      expect(fmt.currency(1234.56)).toBe("$1,234.56");
      expect(fmt.currency(1234.56, { currency: "EUR" })).toBe("€1,234.56");
      expect(fmt.currency(1234.56, { currencyDisplay: "code" })).toBe("USD 1,234.56");
    });

    it("formats compact currency above threshold", () => {
      expect(fmt.currency(49900)).toBe("$49.9K");
    });

    it("handles fallbacks", () => {
      expect(fmt.currency(null)).toBe("—");
    });

    it("validates and falls back on invalid currency codes instead of crashing", () => {
      expect(fmt.currency(100, { currency: "INVALID" })).toBe("$100");
    });
  });

  describe("percentage formatting", () => {
    it("formats standard percentages", () => {
      expect(fmt.percentage(12.5)).toBe("12.5%");
      expect(fmt.percentage(0.5, { inputMode: "fraction" })).toBe("50%");
    });

    it("prevents rounding to zero for very small values", () => {
      expect(fmt.percentage(0.001)).toBe("0.001%");
      expect(fmt.percentage(0.00005)).toBe("0.00005%");
    });
  });

  describe("duration formatting", () => {
    it("formats standard duration", () => {
      expect(fmt.duration(150)).toBe("2m 30s");
      expect(fmt.duration(45)).toBe("45s");
      expect(fmt.duration(3600)).toBe("1h 0m");
      expect(fmt.duration(3665)).toBe("1h 1m");
    });

    it("formats verbose duration", () => {
      expect(fmt.duration(3661, { format: "verbose" })).toBe("1 hour, 1 minute, 1 second");
      expect(fmt.duration(120, { format: "verbose" })).toBe("2 minutes");
    });

    it("handles negative durations correctly", () => {
      expect(fmt.duration(-150)).toBe("-2m 30s");
      expect(fmt.duration(-45)).toBe("-45s");
    });
  });

  describe("date and dateTime formatting", () => {
    it("formats dates", () => {
      const dateStr = "2024-01-15T12:00:00Z";
      expect(fmt.date(dateStr)).toContain("Jan 15, 2024");
      expect(fmt.date(dateStr, { dateStyle: "full" })).toContain("Monday");
    });

    it("formats dateTime", () => {
      const dateStr = "2024-01-15T14:30:00Z";
      expect(fmt.dateTime(dateStr)).toContain("2024");
    });

    it("handles string UNIX timestamps", () => {
      expect(fmt.date("1705320000000")).toContain("2024");
    });
  });

  describe("relativeTime formatting", () => {
    it("formats relative times correctly", () => {
      const now = new Date("2024-01-15T12:00:00Z").getTime();
      const past = new Date("2024-01-15T11:59:00Z").getTime();
      const pastHr = new Date("2024-01-15T10:00:00Z").getTime();

      expect(fmt.relativeTime(past, now)).toBe("1 minute ago");
      expect(fmt.relativeTime(pastHr, now)).toBe("2 hours ago");
    });
  });

  describe("production-readiness new features & upgrades", () => {
    it("correctly parses short year strings without treating them as 1970 UNIX timestamps", () => {
      const yrDate = fmt.date("2026");
      expect(yrDate).toContain("2026");
      expect(yrDate).not.toContain("1970");

      // Verify that standard epoch string timestamps still work
      const unixDate = fmt.date("1705320000000");
      expect(unixDate).toContain("2024");
    });

    it("verifies absolute crash-safety for invalid formatting options", () => {
      // Invalid currency display shouldn't crash standard execution
      const badCurrency = fmt.currency(100, { currencyDisplay: "invalid" as any });
      expect(badCurrency).toBe("—");

      // Invalid sign display for decimal formatting shouldn't crash standard execution
      const badSign = fmt.number(123, { signDisplay: "invalid" as any });
      expect(badSign).toBe("—");
    });

    it("supports custom call-level fallbacks overriding the global default", () => {
      expect(fmt.number(null, { fallback: "Missing" })).toBe("Missing");
      expect(fmt.currency(undefined, { fallback: "Free" })).toBe("Free");
      expect(fmt.percentage(null, { fallback: "Empty" })).toBe("Empty");
      expect(fmt.date(null, { fallback: "No Date" })).toBe("No Date");
      expect(fmt.relativeTime(null, { fallback: "No Relative" })).toBe("No Relative");
    });

    it("enforces locale-aware space normalizations (no Swedish 't' capitalization bug)", () => {
      const svFmt = createFormatter({ locale: "sv-SE" });
      // In Swedish, thousand notation can contain lowercase 't'. Verify Swedish suffixes are untouched.
      // Note: We test the output structure doesn't undergo English capitalizations
      const res = svFmt.number(1000, { notation: "compact" });
      expect(res).not.toContain("T");
    });

    it("allows localizing duration label suffixes in duration options", () => {
      const customDur = fmt.duration(150, {
        labels: {
          m: " Min",
          s: " Sec"
        }
      });
      expect(customDur).toBe("2 Min 30 Sec");

      const verboseDur = fmt.duration(3661, {
        format: "verbose",
        labels: {
          hour: { singular: "Stunde", plural: "Stunden" },
          minute: { singular: "Minute", plural: "Minuten" },
          second: { singular: "Sekunde", plural: "Sekunden" }
        }
      });
      expect(verboseDur).toBe("1 Stunde, 1 Minute, 1 Sekunde");
    });

    it("supports custom relativeTime options (style and numeric) via configuration rules and per-call overrides", () => {
      const now = new Date("2024-01-15T12:00:00Z").getTime();
      const pastHr = new Date("2024-01-15T10:00:00Z").getTime();

      // Short relative time
      const shortRelative = fmt.relativeTime(pastHr, { now, style: "short" });
      expect(shortRelative).toBe("2 hr. ago");
    });


    it("correctly parses 10-digit UNIX timestamps in seconds (multiplying by 1000 dynamically)", () => {
      // "1705320000" represents Jan 15, 2024 in seconds. Verify it parses correctly!
      const secDate = fmt.date("1705320000");
      expect(secDate).toContain("2024");
    });

    it("leverages Intl.PluralRules to resolve complex pluralizations in verbose durations (CLDR support)", () => {
      const ruFmt = createFormatter({ locale: "ru-RU" });
      const labels = {
        hour: { one: "час", few: "часа", many: "часов", other: "часов" }
      };

      // 1 hour in Russian -> "1 час"
      const ruOne = ruFmt.duration(3600, { format: "verbose", labels });
      expect(ruOne).toBe("1 час");

      // 2 hours in Russian -> "2 часа"
      const ruFew = ruFmt.duration(7200, { format: "verbose", labels });
      expect(ruFew).toBe("2 часа");

      // 5 hours in Russian -> "5 часов"
      const ruMany = ruFmt.duration(18000, { format: "verbose", labels });
      expect(ruMany).toBe("5 часов");
    });

    it("preserves high-precision fractional decimals in durations", () => {
      // Compact fractional seconds
      const compFrac = fmt.duration(1.543, { fractionalDigits: 2 });
      expect(compFrac).toBe("1.54s");

      // Verbose fractional seconds plural rules resolution
      const verbFrac = fmt.duration(1.5, {
        format: "verbose",
        fractionalDigits: 1,
        labels: {
          second: { one: "second", other: "seconds" }
        }
      });
      expect(verbFrac).toBe("1.5 seconds");
    });

    it("respects hierarchical specialized fallbacks configured at the rules level", () => {
      const fallbacksFmt = createFormatter({
        rules: {
          numberFallback: "No Number",
          currencyFallback: "No Currency",
          dateFallback: "No Date",
          fallback: "Generic"
        }
      });

      // Matches specialized number fallback
      expect(fallbacksFmt.number(null)).toBe("No Number");

      // Matches specialized date fallback
      expect(fallbacksFmt.date(null)).toBe("No Date");

      // PercentageFallback is not set, so falls back to the generic rule fallback "Generic"
      expect(fallbacksFmt.percentage(null)).toBe("Generic");

      // Call-level fallback overrides all rule fallbacks
      expect(fallbacksFmt.number(null, { fallback: "Override" })).toBe("Override");
    });
  });
});
