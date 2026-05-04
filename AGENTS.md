# AGENTS.md

This file is for AI coding agents working in `@livequery/react`.

## Purpose

`@livequery/react` is a thin React integration layer for `@livequery/core`.

This repository is a library package, not an application. Agents should preserve reusable hook behavior and public API compatibility by default.

- `useCollection` creates and initializes `LivequeryCollection` instances in React.
- `useDocument` is a document-focused convenience wrapper over `useCollection`.
- `useObservable` bridges RxJS observables and `BehaviorSubject`s into React state.
- `LivequeryCoreProvider` and `useLivequeryCore` expose a shared `LivequeryCore` through context.
- `createContextFromHook` derives provider and hook pairs from one factory.
- `useAction` wraps async actions with loading, data, and error state.

## Source Of Truth

- Edit `src/`, never `dist/`. `dist/` is generated output.
- Keep ESM-style relative imports with `.js` extensions in source files.
- Preserve public exports from `src/index.ts` unless the task explicitly changes package API.
- Validation command: `bun run build`.

## Project Map

- `src/useCollection.ts`: creates a `LivequeryCollection`, reads `LivequeryCore` from context, initializes by ref.
- `src/useDocument.ts`: subscribes to one document path by wrapping `useCollection` and `useObservable`.
- `src/useObservable.ts`: bridges observable values into React state.
- `src/LivequeryCoreContext.ts`: `LivequeryCoreProvider` and `useLivequeryCore`.
- `src/createContextFromHook.tsx`: helper for provider and hook generation.
- `src/useAction.ts`: action wrapper with loading, data, and error state.
- `src/index.ts`: barrel exports only.

## How Agents Should Use The Library

When writing real consumer code with this package, prefer these patterns:

- Create one shared `LivequeryCore` for the app or data boundary and pass it through `LivequeryCoreProvider`.
- Use `useCollection(ref, options)` for list or document access when you need the full collection object.
- Use `useDocument(ref)` when a component only needs the first document and loading state for a document ref.
- Use `useObservable()` to bridge `collection.items`, `collection.loading`, `collection.error`, or other RxJS sources into React render state.
- Keep collection refs like `posts` for lists and document refs like `posts/post-1` for single-document access.
- Use collection methods like `query()`, `add()`, `update()`, and `delete()` from event handlers or effects, not during render.

Preferred consumer shape:

1. Create `LivequeryCore` in app setup.
2. Provide it via `LivequeryCoreProvider`.
3. Call `useCollection()` or `useDocument()` inside components.
4. Subscribe to reactive fields with `useObservable()`.
5. Trigger queries or mutations from effects or user actions.

Avoid these common mistakes in generated code:

- Do not read `.value` from `BehaviorSubject`s in render and expect rerenders.
- Do not create a new `LivequeryCore` or `LivequeryCollection` on every render.
- Do not call collection mutations directly during render.
- Do not assume falsy refs initialize a collection.
- Do not rely on exports that are not present in `src/index.ts`; use the source barrel as the package API source of truth.

## Runtime Model

- `useCollection()` memoizes one `LivequeryCollection` per hook call and re-initializes it when `ref` changes.
- `useDocument()` returns `[items[0], loading]` from the underlying collection state.
- `useObservable()` subscribes to an observable source inside an effect and mirrors emissions into React state.
- `LivequeryCoreProvider` is built with `createContextFromHook()` and supplies the active `LivequeryCore` to hooks.

## Important Constraints

- This package assumes React usage around `@livequery/core`; do not move transport or storage responsibilities here.
- `useCollection()` depends on a `LivequeryCoreProvider` ancestor providing a core instance.
- `useObservable()` treats `BehaviorSubject` specially by reading its initial value through `getValue()`.
- Generated UI code should preserve optimistic metadata from `@livequery/core` when pending or error state matters.

## Known Sharp Edges

- `useCollection()` memoizes the collection with an empty dependency array, so option changes after first render do not rebuild the instance.
- `useDocument()` returns the first item in collection state rather than a separate dedicated document object.
- `useObservable()` uses runtime detection and effect subscriptions; subtle changes can alter rerender behavior.
- `README.md` can lag behind `src/index.ts`; prefer the source barrel when checking actual exports.

## Validation

- Preferred build check: `bun run build`.
- There is no dedicated automated test suite in this package at the moment.
- If you change hook semantics, re-check `src/useCollection.ts`, `src/useDocument.ts`, and `src/useObservable.ts` together.

## Documentation Boundary

- `README.md` is end-user documentation.
- `AGENTS.md` should stay focused on implementation guidance, usage rules for generated code, and editing safety for agents.