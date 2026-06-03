# AGENTS.md

This file is for AI coding agents working in `@livequery/react`.

## Purpose

`@livequery/react` is a thin React integration layer for `@livequery/client`.

This repository is a library package, not an application. Agents should preserve reusable hook behavior and public API compatibility by default.

- `useCollection` creates and initializes `LivequeryCollection` instances in React.
- `useDocument` is a document-focused convenience wrapper over `useCollection`.
- `useObservable` bridges RxJS observables and `BehaviorSubject`s into React state.
- `LivequeryClientProvider` and `useLivequeryClient` expose a shared `LivequeryClient` through context.
- `createContextFromHook` derives provider and hook pairs from one factory.
- `useAction` wraps async actions with loading, data, and error state.

## Source Of Truth

- Edit `src/`, never `dist/`. `dist/` is generated output.
- Keep ESM-style relative imports with `.js` extensions in source files.
- Preserve public exports from `src/index.ts` unless the task explicitly changes package API.
- Validation commands: `bun test` and `bun run build`.
- Use `AGENT_API_GUIDE.md` for public API usage rules and hook-specific guidance.

## Project Map

- `src/useCollection.ts`: creates a `LivequeryCollection`, reads `LivequeryClient` from context, initializes by ref.
- `src/useDocument.ts`: subscribes to one document path by wrapping `useCollection` and `useObservable`.
- `src/useObservable.ts`: bridges observable values into React state.
- `src/LivequeryClientContext.ts`: `LivequeryClientProvider` and `useLivequeryClient`.
- `src/createContextFromHook.tsx`: helper for provider and hook generation.
- `src/useAction.ts`: action wrapper with loading, data, and error state.
- `src/index.ts`: barrel exports only.

## How Agents Should Use The Library

When writing real consumer code with this package, prefer these patterns:

- Create one shared `LivequeryClient` for the app or data boundary and pass it through `LivequeryClientProvider`.
- Use `useCollection(ref, options)` for list or document access when you need the full collection object.
- Use `useDocument(ref)` when a component only needs the first document and loading state for a document ref.
- Use `useObservable()` to bridge `collection.items`, `collection.loading`, `collection.error`, or other RxJS sources into React render state.
- Keep collection refs like `posts` for lists and document refs like `posts/post-1` for single-document access.
- Use collection methods like `query()`, `add()`, `update()`, and `delete()` from event handlers or effects, not during render.

Preferred consumer shape:

1. Create `LivequeryClient` in app setup.
2. Provide it via `LivequeryClientProvider`.
3. Call `useCollection(ref, { lazy: false })` or `useDocument()` inside components.
4. Subscribe to reactive fields with `useObservable()`.
5. With `lazy: false`, the collection queries automatically — no manual `query()` call needed. Use `lazy: true` only when the query must be triggered explicitly.

Avoid these common mistakes in generated code:

- Do not read `.value` from `BehaviorSubject`s in render and expect rerenders.
- Do not create a new `LivequeryClient` or `LivequeryCollection` on every render.
- Do not call collection mutations directly during render.
- Do not assume falsy refs initialize a collection.
- Do not rely on exports that are not present in `src/index.ts`; use the source barrel as the package API source of truth.

## Mandatory Collection Rendering Pattern

`collection.items` is `BehaviorSubject<BehaviorSubject<T>[]>`. This is not a plain array. Agents must follow the three-component pattern below whenever rendering a collection. Violating it either breaks realtime updates or causes the full list to re-render on every field change.

**Rule 1 — Subscribe to the outer subject in the parent:**

```tsx
const items = useObservable(collection.items, [])
// items: BehaviorSubject<T>[]  — re-renders only on count or order change
```

**Rule 2 — Dedicate a child component to each item:**

```tsx
function ItemRow({ item$ }: { item$: BehaviorSubject<T> }) {
  const item = useObservable(item$)  // re-renders only when this item's fields change
  return <li>{item.title}</li>
}
```

Never call `useObservable(item$)` inside the parent `.map()`. That collapses both levels into the parent and re-renders the whole list on every field change.

**Rule 3 — Dedicate a child component to loading state:**

```tsx
function ListLoading({ loading$ }: { loading$: BehaviorSubject<boolean> }) {
  const loading = useObservable(loading$)
  if (!loading) return null
  return <p>Loading...</p>
}
```

`collection.loading` is a `BehaviorSubject<boolean>`. Observing it in the same component as the item list means every loading toggle re-renders the full list.

**Canonical shape:**

```tsx
export function TodoList() {
  // lazy: false — auto-queries on initialization, no manual query() call needed
  const collection = useCollection<Todo>('todos', { lazy: false })
  const items = useObservable(collection.items, [])

  return (
    <>
      <ListLoading loading$={collection.loading} />
      <ul>
        {items.map((item$) => (
          <TodoItem key={item$.getValue()._id} item$={item$} />
        ))}
      </ul>
    </>
  )
}
```

See `AGENT_API_GUIDE.md` for the full checklist and annotated example.

## Runtime Model

- `useCollection()` memoizes a `LivequeryCollection` with memo deps `[client, ref]`; when `ref` changes it creates a fresh instance and initializes it for the new ref.
- `useDocument()` returns `[items[0], loading]` from the underlying collection state.
- `useObservable()` subscribes to an observable source inside an effect and mirrors emissions into React state. `BehaviorSubject` initial values are read with `getValue()`, and lazy source functions are resolved once.
- `LivequeryClientProvider` is built with `createContextFromHook()` and supplies the active `LivequeryClient` to hooks.
- `createContextFromHook()` throws `Context provider is missing` when the generated hook is consumed outside its provider.
- `useAction()` only allows the latest in-flight call to update visible action state.

## Important Constraints

- This package assumes React usage around `@livequery/client`; do not move transport or storage responsibilities here.
- `useCollection()` depends on a `LivequeryClientProvider` ancestor providing a client instance.
- `useObservable()` treats `BehaviorSubject` specially by reading its initial value through `getValue()`.
- Generated UI code should preserve optimistic metadata from `@livequery/client` when pending or error state matters.

## Known Sharp Edges

- `useCollection()` memoizes the collection with deps `[client, ref]`: changing `ref` rebuilds (a fresh instance), but changing `options`/`filters` while `ref` stays the same does not rebuild the instance.
- `useDocument()` returns the first item in collection state rather than a separate dedicated document object.
- `useObservable()` uses runtime detection and effect subscriptions; subtle changes can alter rerender behavior.
- `README.md` can lag behind `src/index.ts`; prefer the source barrel when checking actual exports.
- `collection.items` is `BehaviorSubject<BehaviorSubject<T>[]>` — the inner subjects are the realtime handles per item. Flattening them without the three-component pattern silently disables per-item reactivity.

## Validation

- Preferred build check: `bun run build`.
- Preferred test check: `bun test`.
- Full workspace typecheck, including tests: `bunx tsc -p tsconfig.json`.
- If you change hook semantics, re-check `src/useCollection.ts`, `src/useDocument.ts`, and `src/useObservable.ts` together.

## Documentation Boundary

- `README.md` is end-user documentation.
- `AGENTS.md` should stay focused on implementation guidance, usage rules for generated code, and editing safety for agents.
- `AGENT_API_GUIDE.md` is the detailed public API usage guide for agents generating consumer code or modifying hook behavior.
