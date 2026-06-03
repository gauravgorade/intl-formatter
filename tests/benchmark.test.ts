import { test } from "vitest";
import { createFormatter } from "../src/core/formatter.js";

test("run benchmark", () => {
  const fmt = createFormatter({
    locale: "en-US",
    currency: "USD",
    rules: {
      compactThreshold: 10000,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  });

  const ITERATIONS = 10_000; // Let's use 10,000 for vitest run to keep it fast

  console.log(`Running benchmark with ${ITERATIONS.toLocaleString()} iterations...`);

  // 1. Number Formatting
  const startNumber = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fmt.number(1234.56 + (i % 100));
    fmt.number(1234567 + (i % 1000));
  }
  const endNumber = performance.now();
  const timeNumber = endNumber - startNumber;

  // 2. Currency Formatting
  const startCurrency = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fmt.currency(1234.56 + (i % 100));
    fmt.currency(49900 + (i % 1000));
  }
  const endCurrency = performance.now();
  const timeCurrency = endCurrency - startCurrency;

  // 3. Percentage Formatting
  const startPercentage = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fmt.percentage(12.5 + (i % 10) / 10);
    fmt.percentage(0.001 + (i % 100) / 10000);
  }
  const endPercentage = performance.now();
  const timePercentage = endPercentage - startPercentage;

  // 4. Duration Formatting
  const startDuration = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fmt.duration(150 + (i % 100));
    fmt.duration(3661 + (i % 1000), { format: "verbose" });
  }
  const endDuration = performance.now();
  const timeDuration = endDuration - startDuration;

  // 5. Date Formatting
  const startDate = performance.now();
  const dateStr = "2024-01-15T12:00:00Z";
  for (let i = 0; i < ITERATIONS; i++) {
    fmt.date(dateStr);
  }
  const endDate = performance.now();
  const timeDate = endDate - startDate;

  // 6. DateTime Formatting
  const startDateTime = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fmt.dateTime(dateStr);
  }
  const endDateTime = performance.now();
  const timeDateTime = endDateTime - startDateTime;

  // 7. RelativeTime Formatting
  const startRelative = performance.now();
  const now = Date.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fmt.relativeTime(now - 60000 * (i % 100), now);
  }
  const endRelative = performance.now();
  const timeRelative = endRelative - startRelative;

  console.log("\n---- BENCHMARK RESULTS ----");
  console.log(`Number Format:       ${timeNumber.toFixed(2)} ms (${Math.round((ITERATIONS * 2) / (timeNumber / 1000))} ops/sec)`);
  console.log(`Currency Format:     ${timeCurrency.toFixed(2)} ms (${Math.round((ITERATIONS * 2) / (timeCurrency / 1000))} ops/sec)`);
  console.log(`Percentage Format:   ${timePercentage.toFixed(2)} ms (${Math.round((ITERATIONS * 2) / (timePercentage / 1000))} ops/sec)`);
  console.log(`Duration Format:     ${timeDuration.toFixed(2)} ms (${Math.round((ITERATIONS * 2) / (timeDuration / 1000))} ops/sec)`);
  console.log(`Date Format:         ${timeDate.toFixed(2)} ms (${Math.round(ITERATIONS / (timeDate / 1000))} ops/sec)`);
  console.log(`DateTime Format:     ${timeDateTime.toFixed(2)} ms (${Math.round(ITERATIONS / (timeDateTime / 1000))} ops/sec)`);
  console.log(`RelativeTime Format: ${timeRelative.toFixed(2)} ms (${Math.round(ITERATIONS / (timeRelative / 1000))} ops/sec)`);
  console.log("--------\n");
});
