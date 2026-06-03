# Contributing to intl-formatter

Thank you for your interest in contributing to intl-formatter! This guide provides everything you need to get set up and start contributing.

## Development Setup

### Requirements
* Node.js 18+
* npm

### Setup Steps
```bash
# Clone the repository
git clone https://github.com/gauravgorade/intl-formatter.git
cd intl-formatter

# Install dependencies
npm install

# Run the test suite
npm test

# Build the distribution packages
npm run build

# Run in development watch mode
npm run dev
```

## Project Structure

* **`src/core/`**: Core synchronous formatting engine (`formatter.ts`, `types.ts`). Highly optimized, dependency-free.
* **`src/index.ts`**: Pure library entry point exporting `createFormatter` and types.
* **`src/testing.ts`**: Testing utilities and mocks (`mockFormatter`).
* **`tests/`**: Suite of unit, integration, benchmark, and crash-safety fuzz tests.

## Guidelines & Contribution Rules

### Core Development Principles
* **Synchronous & Safe:** All formatting methods must execute synchronously and remain 100% crash-safe. Always encapsulate raw JS/native operations in try/catch bounds to return the configured fallback.
* **Dependency-Free Engine:** `src/core/formatter.ts` and the overall library must remain completely dependency-free. Do not introduce production dependencies.
* **Synchronized Mocks:** If you introduce new features or formatting methods, make sure they are matched exactly in `src/testing.ts` (`mockFormatter` return states).

### Documentation Standards
* Keep all examples matching the latest V3 implementation. Code remains the absolute source of truth.
* Document new APIs in the README and JSDoc blocks of code.

### Commits & PR Workflow
* **Commit Style:** Keep messages concise and prefix them semantically (e.g. `feat:`, `fix:`, `docs:`, `test:`).
* **PR Process:**
  1. Fork the repository and create a branch from `main`.
  2. Implement changes, ensuring they are backed by tests.
  3. Run `npm test` locally to verify 100% test coverage.
  4. Open a pull request with a clear description of the problem solved and the implementation details.
