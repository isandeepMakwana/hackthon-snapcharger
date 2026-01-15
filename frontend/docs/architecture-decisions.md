# Architecture Decisions

## ADR-001: Feature-based folder structure

**Decision**: Organize source under `src/` with feature folders (`features/driver`, `features/host`) and shared components in `components/`.

**Why**: The original flat structure made large components harder to evolve. Feature boundaries keep domain logic scoped and simplify onboarding.

**Consequences**: Imports now use `@/` aliases and tests can target feature modules directly.

## ADR-002: Zustand for state management

**Decision**: Use Zustand to manage stations, view mode, and host stats in a centralized store.

**Why**: Zustand provides lightweight global state without the ceremony of Redux while remaining testable and typed.

**Consequences**: Components consume state through selectors and can reset state in tests.

## ADR-003: Tailwind with design tokens

**Decision**: Replace CDN Tailwind with a build-time Tailwind setup backed by CSS variables.

**Why**: Production builds need purge, custom tokens, and consistent styling across Storybook and CI.

**Consequences**: Styling is now compiled, tokenized, and documented.

## ADR-004: Dynamic imports for Leaflet and Gemini

**Decision**: Load Leaflet and Gemini only when required (map view and image analysis).

**Why**: These libraries are heavy; lazy loading reduces initial bundle size and speeds up first paint.

**Consequences**: The main bundle is smaller and split into feature chunks.

## ADR-005: Jest + React Testing Library

**Decision**: Use Jest with React Testing Library for unit and integration tests.

**Why**: This stack matches frontend industry standards and provides user-focused testing.

**Consequences**: Tests use DOM querying and simulate real interactions.

## ADR-006: Build-time env injection via Vite define

**Decision**: Read `VITE_GEMINI_API_KEY` from `process.env` and inject it with Vite's `define` option.

**Why**: This keeps build-time substitution while making Jest test runs compatible without `import.meta` parsing.

**Consequences**: The API key is still embedded at build time, so it remains a public frontend secret (acceptable for demo usage only).

## ADR-007: Client-only auth gating

**Decision**: Implement login/register flows and role gating entirely in the frontend, without a backend.

**Why**: This keeps the demo self-contained while modeling the real user flows needed for booking and host access.

**Consequences**: Role selection is simulated (email contains "host" or host selection in signup). The logic should be replaced with real authentication when APIs exist.
