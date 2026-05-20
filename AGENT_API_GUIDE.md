# AGENT_API_GUIDE.md

This file is for AI agents that generate consumer code with `@livequery/react` or modify this package.

Use `README.md` as end-user documentation. Use this file as operational guidance: which API to choose, what each function means, and what mistakes to avoid.

## Package Role

`@livequery/react` is a React integration layer over `@livequery/client`.

Do not move client, transport, cache, query, or persistence responsibilities into this package. This package should stay focused on React hooks, context wiring, and observable-to-state bridging.

## Public API Source Of Truth

Public exports are defined in `src/index.ts`.

Current public APIs:

- `LivequeryClientProvider`
- `useLivequeryClient`
- `useCollection`
- `useDocument`
- `useObservable`
- `useAction`
- `createContextFromHook`

Do not rely on README examples, old generated docs, or `dist/` when checking public API availability. `dist/` is generated output.

## Consumer Code Pattern

Preferred shape for real app code:

1. Create one `LivequeryClient` outside render or inside stable app setup.
2. Provide it with `<LivequeryClientProvider core={client}>`.
3. Use `useCollection()` or `useDocument()` inside child components.
4. Use `useObservable()` to render values from RxJS sources.
5. Trigger collection queries and mutations from effects or event handlers.

Do not create a `LivequeryClient` or `LivequeryCollection` during every render.

## `LivequeryClientProvider`

Meaning: provides the active `LivequeryClient` through React context.

Use when:

- a React tree needs access to one shared `LivequeryClient`
- generated components call `useCollection()`, `useDocument()`, or `useLivequeryClient()`
- a feature boundary needs a separate client instance

Correct usage:

```tsx
<LivequeryClientProvider core={client}>
  <Feature />
</LivequeryClientProvider>
```

Important:

- The prop is currently named `core`.
- Do not generate `<LivequeryClientProvider client={client}>` unless the implementation is changed first.

## `useLivequeryClient`

Meaning: reads the nearest client from `LivequeryClientProvider`.

Use when:

- consumer code needs direct access to the client
- a lower-level helper needs the shared client but should not receive it by prop

Avoid when:

- `useCollection()` already covers the data access pattern
- passing the collection object is clearer than accessing the client directly

The hook throws `Context provider is missing` if no provider exists.

## `useCollection`

Meaning: creates one `LivequeryCollection<T>` for a hook call and initializes it when `ref` is truthy.

Use when:

- the component needs list data
- the component needs collection methods such as `query()`, `add()`, `update()`, or `delete()`
- the component needs multiple reactive fields from the collection, such as `items`, `loading`, and `error`

Recommended pattern:

```tsx
const collection = useCollection<Todo>('todos', { lazy: false })
const items = useObservable(collection.items, [])
const loading = useObservable(collection.loading, false)

useEffect(() => {
  collection.query()
}, [collection])
```

Important:

- Falsy refs skip initialization.
- The collection instance is memoized for the lifetime of the hook call.
- `options` are captured when the collection instance is first created.
- If behavior depends on changing options, either stabilize options or intentionally remount the component/hook.
- Do not call query or mutation methods during render.

## `useDocument`

Meaning: convenience wrapper for reading one document from a document ref.

It calls `useCollection(ref, { lazy })`, subscribes to `collection.items` and `collection.loading`, then returns `[items[0], loading]`.

Use when:

- the component only needs one document
- the UI only needs the document value and loading state
- the document ref shape is like `posts/post-1`

Avoid when:

- the component needs error state
- the component needs collection methods
- the component needs more than the first item
- the component needs custom collection options beyond `lazy`

Use `useCollection()` directly for those cases.

## `useObservable`

Meaning: subscribes to an RxJS `Observable` or `BehaviorSubject` and mirrors emissions into React state.

Use when:

- rendering `collection.items`
- rendering `collection.loading`
- rendering `collection.error`
- rendering any RxJS source that should trigger rerenders

Accepted input shapes:

```tsx
useObservable(source$)
useObservable(source$, defaultValue)
useObservable(() => source$)
```

Important:

- `BehaviorSubject` initial state is read with `getValue()`.
- Lazy source functions are resolved once for the hook lifetime.
- `undefined` sources are allowed and return the default value or `undefined`.
- Do not read `.value` from `BehaviorSubject` in render and expect React rerenders.

When modifying this hook, re-run hook tests. Small changes to initial value handling, lazy source resolution, or subscription cleanup can create subtle regressions.

## `useAction`

Meaning: wraps an async function with React state for `loading`, `data`, and `error`.

Use when:

- a button triggers async work
- a form submit needs loading state
- generated UI needs a simple action object without writing custom state each time

Returned value:

- callable function with the same call shape as the async function
- `loading`
- `data`
- `error`

Important:

- Only the latest in-flight call may update state.
- Older calls still resolve or reject, but they must not overwrite visible state after a newer call starts.
- Keep `onError` behavior when modifying this hook.

## `createContextFromHook`

Meaning: derives a provider and consumer hook pair from one provider-side factory.

Use when:

- a value should be computed from provider props
- descendants should consume the value through a hook
- code would otherwise repeat `createContext`, `useContext`, and provider wiring

Example shape:

```tsx
const [useSession, SessionProvider] = createContextFromHook(
  ({ token }: { token: string }) => ({ token })
)
```

Important:

- The generated provider calls the factory on every render.
- This helper does not memoize the computed value.
- The generated hook throws if consumed outside the provider.

Do not use this helper to hide unstable values that change every render unless downstream rerendering is intended.

## Editing Rules

- Edit `src/`, never generated `dist/`.
- Keep source imports ESM-compatible and include `.js` extensions for relative imports.
- Preserve exports from `src/index.ts` unless the task explicitly changes public API.
- If hook behavior changes, update README, this guide, and tests together.
- Avoid broad refactors in this package. It is intentionally small.

## Validation

Run these checks after source or docs changes that affect behavior:

```bash
bun test
bun run build
```

For typechecking tests and non-build files:

```bash
bunx tsc -p tsconfig.json
```

Expected test coverage currently includes:

- `useObservable` initial values and lazy sources
- `createContextFromHook` provider and missing-provider behavior
- `useAction` overlapping call behavior

## Generated Code Checklist

Before producing consumer code with this package, verify:

- A `LivequeryClientProvider` ancestor exists.
- The provider uses `core={client}`.
- Collection state is rendered through `useObservable()`.
- Collection queries and mutations run in effects or event handlers.
- Document refs use a document-like path when using `useDocument()`.
- No nonexistent exports are imported.
- No `BehaviorSubject` is read directly in render as a substitute for subscription.
