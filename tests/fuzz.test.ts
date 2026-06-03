import { describe, it, expect } from "vitest";
import { createFormatter } from "../src/core/formatter.js";

describe("fuzzing and extreme inputs stress tests", () => {
  const fmt = createFormatter({
    locale: "en-US",
    currency: "USD",
    fallback: "—",
  });

  const fuzzCorpus = [
    // Primitives and nil values
    null,
    undefined,
    "",
    "   ",
    "\n\t\r",
    true,
    false,

    // Extreme and subnormal numbers
    0,
    -0,
    1,
    -1,
    0.0000000000000001,
    -0.0000000000000001,
    1e30,
    -1e30,
    1e-30,
    Infinity,
    -Infinity,
    NaN,
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    Number.MAX_VALUE,
    Number.MIN_VALUE,

    // Malformed string numbers and dates
    "123",
    "-123",
    "123.45",
    "1.23e+4",
    "invalid_string",
    "123invalid",
    "invalid123",
    "NaN",
    "Infinity",
    "-Infinity",
    "0x1f", // Hex representation
    "0b101", // Binary representation
    "0o77", // Octal representation
    "1,234.56", // Pre-formatted string

    // Date inputs
    new Date(),
    new Date(NaN),
    new Date("invalid-date-string"),
    "2024-01-15T12:00:00Z",
    "2024-01-15T12:00:00+14:00", // Extreme timezone offset
    "1705320000000", // UNIX timestamp string
    "-1705320000000", // Negative UNIX timestamp string
    99999999999999, // Way out of standard bounds

    // Objects, functions, arrays, and symbols
    [],
    [1, 2, 3],
    [null],
    [[[]]], // Nested empty arrays
    {},
    { a: 1 },
    { valueOf: () => 42 },
    { toString: () => "123" },
    {
      // Throwing object - highly toxic DoS vector
      valueOf() {
        throw new Error("Toxic valueOf throw");
      },
      toString() {
        throw new Error("Toxic toString throw");
      },
    },
    (() => { }) as any, // Plain function
    Symbol("fuzz") as any, // Symbol input
    Promise.resolve(100) as any, // Unresolved promise
    /fuzz-regex/ as any, // Regular expression instance
  ];

  it("handles all fuzz inputs without throwing runtime errors", () => {
    for (const input of fuzzCorpus) {
      // 1. Decimal Format Fuzzing
      expect(() => {
        const res = fmt.number(input as any);
        expect(typeof res).toBe("string");
      }).not.toThrow();

      expect(() => {
        const res = fmt.number(input as any, { notation: "compact" });
        expect(typeof res).toBe("string");
      }).not.toThrow();

      // 2. Currency Format Fuzzing
      expect(() => {
        const res = fmt.currency(input as any);
        expect(typeof res).toBe("string");
      }).not.toThrow();

      expect(() => {
        const res = fmt.currency(input as any, { currency: "EUR", currencyDisplay: "code" });
        expect(typeof res).toBe("string");
      }).not.toThrow();

      expect(() => {
        const res = fmt.currency(input as any, { currency: "INVALID_CODE" as any });
        expect(typeof res).toBe("string");
      }).not.toThrow();

      // 3. Percentage Format Fuzzing
      expect(() => {
        const res = fmt.percentage(input as any);
        expect(typeof res).toBe("string");
      }).not.toThrow();

      expect(() => {
        const res = fmt.percentage(input as any, { inputMode: "fraction" });
        expect(typeof res).toBe("string");
      }).not.toThrow();

      // 4. Duration Format Fuzzing
      expect(() => {
        const res = fmt.duration(input as any);
        expect(typeof res).toBe("string");
      }).not.toThrow();

      expect(() => {
        const res = fmt.duration(input as any, { format: "verbose" });
        expect(typeof res).toBe("string");
      }).not.toThrow();

      // 5. Date Format Fuzzing
      expect(() => {
        const res = fmt.date(input as any);
        expect(typeof res).toBe("string");
      }).not.toThrow();

      expect(() => {
        const res = fmt.date(input as any, { dateStyle: "full" });
        expect(typeof res).toBe("string");
      }).not.toThrow();

      // 6. DateTime Format Fuzzing
      expect(() => {
        const res = fmt.dateTime(input as any);
        expect(typeof res).toBe("string");
      }).not.toThrow();

      expect(() => {
        const res = fmt.dateTime(input as any, { timeStyle: "medium" });
        expect(typeof res).toBe("string");
      }).not.toThrow();

      // 7. Relative Time Fuzzing
      expect(() => {
        const res = fmt.relativeTime(input as any);
        expect(typeof res).toBe("string");
      }).not.toThrow();
    }
  });
});
