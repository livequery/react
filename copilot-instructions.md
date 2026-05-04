# Copilot Instructions

This workspace is a library package, not an application.

When generating code, reviewing changes, or answering questions in this repository:

- Treat `@livequery/react` as a thin React bindings package for `@livequery/core`.
- Edit `src/`, never `dist/`.
- Keep `.js` suffixes in TypeScript source imports.
- Preserve public exports from `src/index.ts` unless the task explicitly changes package API.
- Use Bun for local commands when possible. Preferred validation command: `bun run build`.
- Generate app examples around one shared `LivequeryCore` passed through `LivequeryCoreProvider`.
- Use `useCollection()` or `useDocument()` to obtain collection state and `useObservable()` to bridge reactive values into render state.
- Do not present one-time `.value` reads as sufficient for live UI updates.
- Trigger queries and mutations from effects or event handlers, not directly during render.
- Use collection refs for lists and document refs for single-document access.
- Prefer the actual source barrel in `src/index.ts` over README text when deciding what is exported.

Current implementation sharp edges worth remembering:

- `useCollection()` memoizes its collection instance once, so later option changes do not reconstruct it.
- `useDocument()` is a convenience wrapper over collection state and returns `items[0]`.
- `useObservable()` uses runtime `BehaviorSubject` detection and effect-based subscriptions, so small changes can affect rerender timing.