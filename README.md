# @livequery/react

Thin React bindings for `@livequery/client`.

This package is a small integration layer. It does not implement transport, storage, caching, or query behavior itself. Those responsibilities stay in `@livequery/client`; this package gives React components a clean way to access a shared `LivequeryClient`, create `LivequeryCollection` instances, and mirror RxJS streams into render state.

## Install

```bash
bun add @livequery/react @livequery/client react rxjs
```

Or with npm:

```bash
npm install @livequery/react @livequery/client react rxjs
```

## Exports

- `LivequeryClientProvider`
- `useLivequeryClient`
- `useCollection`
- `useDocument`
- `useObservable`
- `useAction`
- `createContextFromHook`

## Recommended App Shape

Create one `LivequeryClient` for your app or data boundary, provide it once, then use hooks inside descendant components.

```tsx
import { LivequeryClient } from '@livequery/client'
import { LivequeryClientProvider } from '@livequery/react'

const client = new LivequeryClient({
  endpoint: 'https://your-livequery-server'
})

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LivequeryClientProvider core={client}>
      {children}
    </LivequeryClientProvider>
  )
}
```

Use collection methods from effects or event handlers, not during render. Use `useObservable()` to subscribe to reactive fields before rendering their values.

## `LivequeryClientProvider`

`LivequeryClientProvider` makes a shared `LivequeryClient` available to `useCollection()` and any component that calls `useLivequeryClient()`.

Use it when:

- an app has one shared Livequery connection
- a route, workspace, tenant, or feature boundary needs its own client
- hooks below the boundary should avoid receiving the client as a prop

```tsx
<LivequeryClientProvider core={client}>
  <TodoList />
</LivequeryClientProvider>
```

The provider currently expects a `core` prop. Passing `client` will not work unless the implementation is changed.

## `useLivequeryClient`

`useLivequeryClient()` reads the nearest `LivequeryClient` from `LivequeryClientProvider`.

Use it when you need direct access to the shared client, usually for setup code or integration with APIs that are not covered by `useCollection()`.

```tsx
import { useLivequeryClient } from '@livequery/react'

export function ClientStatus() {
  const client = useLivequeryClient()
  return <span>{client ? 'Connected' : 'Missing client'}</span>
}
```

The hook must be used under a matching provider. If it is called outside the provider tree, the generated context hook throws `Context provider is missing`.

## `useCollection`

`useCollection<T>(ref, options)` creates one `LivequeryCollection<T>` for the component, initializes it when `ref` is truthy, and returns the collection instance.

Use it when a component needs the full collection API: reactive state plus methods such as querying or mutations.

```tsx
import { useEffect } from 'react'
import { useCollection, useObservable } from '@livequery/react'

type Todo = {
  _id: string
  title: string
  done: boolean
}

export function TodoList() {
  const collection = useCollection<Todo>('todos', { lazy: false })
  const items = useObservable(collection.items, [])
  const loading = useObservable(collection.loading, false)
  const error = useObservable(collection.error)

  useEffect(() => {
    collection.query()
  }, [collection])

  if (loading) return <p>Loading...</p>
  if (error) return <p>Could not load todos.</p>

  return (
    <ul>
      {items.map((todo) => (
        <li key={todo._id}>{todo.title}</li>
      ))}
    </ul>
  )
}
```

Behavior notes:

- `ref` may be `undefined`, `null`, `false`, or an empty string. Falsy refs skip initialization.
- The same hook call keeps one collection instance for the lifetime of the component.
- `options` are used when that collection instance is first created. Pass stable options, or remount the hook if options need to change.
- Subscribe to fields such as `collection.items`, `collection.loading`, and `collection.error` with `useObservable()`.
- Do not call `query()`, `add()`, `update()`, or `delete()` directly during render.

## `useDocument`

`useDocument<T>(ref, options)` is a document-focused convenience wrapper over `useCollection()`.

It initializes a collection for a document ref, subscribes to collection items and loading state, then returns `[items[0], loading]`.

Use it when a component only needs one document and a loading flag.

```tsx
import { useDocument } from '@livequery/react'

type Todo = {
  _id: string
  title: string
  done: boolean
}

export function TodoDetail({ id }: { id: string }) {
  const [todo, loading] = useDocument<Todo>(`todos/${id}`)

  if (loading) return <p>Loading...</p>
  if (!todo) return <p>Not found</p>

  return <h1>{todo.title}</h1>
}
```

Use `useCollection()` instead when you need collection methods, error state, multiple documents, or more control over subscriptions.

## `useObservable`

`useObservable()` bridges an RxJS `Observable` or `BehaviorSubject` into React state.

Use it for any reactive value that should cause a component rerender when it emits.

```tsx
import { BehaviorSubject } from 'rxjs'
import { useObservable } from '@livequery/react'

const counter$ = new BehaviorSubject(0)

export function Counter() {
  const value = useObservable(counter$, 0)
  return <span>{value}</span>
}
```

Supported shapes:

```tsx
const value = useObservable(source$)
const valueWithDefault = useObservable(source$, defaultValue)
const lazyValue = useObservable(() => source$)
```

Behavior notes:

- `BehaviorSubject` is treated specially. Its initial value is read with `getValue()` so the first render can use the current value.
- Lazy sources are resolved once for the hook lifetime.
- If the source is `undefined`, the hook returns the default value, or `undefined` if no default was provided.
- Reading `.value` or `.getValue()` manually in render is not a replacement for `useObservable()` because it will not subscribe the component to future emissions.

## Rendering a Collection (Mandatory Pattern)

`collection.items` is a `BehaviorSubject<BehaviorSubject<T>[]>`. This two-level structure is intentional and must be respected to achieve both realtime updates and high render performance.

**How it works:**

- The outer `BehaviorSubject` emits a new array only when items are added, removed, or reordered.
- Each element in the array is itself a `BehaviorSubject<T>` that emits whenever that specific item's fields change.
- A field update on one item emits only that item's inner subject — the outer array does not change and the parent list does not re-render.

This means correct rendering requires three separate component layers:

### Rule 1 — Subscribe to the items array in the parent

```tsx
const items = useObservable(collection.items, [])
// items = BehaviorSubject<T>[]
// Re-renders only when item count or order changes
```

### Rule 2 — Render each item in its own component

Pass the `BehaviorSubject<T>` as a prop and call `useObservable` inside the child. Field changes re-render only that child.

```tsx
function TodoItem({ item$ }: { item$: BehaviorSubject<Todo> }) {
  const item = useObservable(item$)
  return <li>{item.title}</li>
}
```

### Rule 3 — Render loading state in its own component

`collection.loading` is also a `BehaviorSubject<boolean>`. Place it in a separate component so toggling loading does not re-render the item list.

```tsx
function TodoLoading({ loading$ }: { loading$: BehaviorSubject<boolean> }) {
  const loading = useObservable(loading$)
  if (!loading) return null
  return <p>Loading...</p>
}
```

### Full example

```tsx
import { useEffect } from 'react'
import { BehaviorSubject } from 'rxjs'
import { useCollection, useObservable } from '@livequery/react'

type Todo = { _id: string; title: string; done: boolean }

function TodoLoading({ loading$ }: { loading$: BehaviorSubject<boolean> }) {
  const loading = useObservable(loading$)
  if (!loading) return null
  return <p>Loading...</p>
}

function TodoItem({ item$ }: { item$: BehaviorSubject<Todo> }) {
  const item = useObservable(item$)
  return <li>{item.title}</li>
}

export function TodoList() {
  const collection = useCollection<Todo>('todos')
  const items = useObservable(collection.items, [])

  useEffect(() => {
    collection.query()
  }, [collection])

  return (
    <>
      <TodoLoading loading$={collection.loading} />
      <ul>
        {items.map((item$) => (
          <TodoItem key={item$.getValue()._id} item$={item$} />
        ))}
      </ul>
    </>
  )
}
```

**Why this matters:**

- Putting `useObservable(collection.loading)` and `useObservable(collection.items)` in the same parent component means every loading toggle re-renders the entire list, even when nothing changed.
- Calling `useObservable(item$)` inside the parent map instead of a child component means every field change on any single item re-renders the whole list.
- Following all three rules gives true per-item granularity: only the component that owns a changed field re-renders.

> **Never** flatten `collection.items` by calling `useObservable` on each element inside the parent map. Always delegate to a child component.

## `useAction`

`useAction(fn, options)` wraps an async function and attaches action state to the returned callable.

Use it for button clicks, form submissions, and other event-driven async work where the UI needs `loading`, `data`, or `error`.

```tsx
import { useAction } from '@livequery/react'

export function SaveButton({ save }: { save: () => Promise<{ id: string }> }) {
  const saveAction = useAction(save, {
    onError(error) {
      console.error(error)
    }
  })

  return (
    <button disabled={saveAction.loading} onClick={() => void saveAction()}>
      {saveAction.loading ? 'Saving...' : 'Save'}
    </button>
  )
}
```

The returned function has these state fields:

- `loading`: `true` while the latest call is pending
- `data`: resolved data from the latest successful call
- `error`: normalized `{ code, message }` from the latest failed call

If multiple calls overlap, only the latest call is allowed to update state. Earlier calls still resolve or reject normally, but they will not overwrite the visible action state after a newer call has started.

## `createContextFromHook`

`createContextFromHook(fn)` derives a provider and a consumer hook from one factory function.

Use it when a value should be computed at a provider boundary and consumed through a hook.

```tsx
import { createContextFromHook } from '@livequery/react'

const [useSession, SessionProvider] = createContextFromHook(
  ({ token }: { token: string }) => ({ token })
)

function Child() {
  const session = useSession()
  return <div>{session.token}</div>
}

function App() {
  return (
    <SessionProvider token="abc123">
      <Child />
    </SessionProvider>
  )
}
```

The helper returns:

- `useValue`: reads the current context value
- `Provider`: receives props, calls `fn(props)`, and stores the returned value in context

Behavior notes:

- The provider calls `fn(props)` on every provider render.
- `createContextFromHook()` does not memoize the returned value. Memoize inside `fn` or stabilize provider props if recomputation matters.
- The generated hook throws `Context provider is missing` when consumed outside its provider.

`LivequeryClientProvider` and `useLivequeryClient` are built with this helper.

## Choosing The Right API

- Use `LivequeryClientProvider` once near the app or data boundary.
- Use `useLivequeryClient()` only when you need direct client access.
- Use `useCollection()` when you need collection methods or multiple reactive collection fields.
- Use `useDocument()` when you only need the first document and loading state.
- Use `useObservable()` whenever an RxJS source should drive rendering.
- Use `useAction()` for async event handlers that need loading, data, and error state.
- Use `createContextFromHook()` for package or app utilities that should expose provider plus hook pairs.

## Common Mistakes

- Creating a new `LivequeryClient` inside a component render.
- Calling collection mutations directly during render.
- Reading `BehaviorSubject` values manually and expecting rerenders.
- Passing changing `useCollection()` options and expecting the existing collection instance to rebuild.
- Using `useDocument()` when you need error state or collection methods.
- Importing APIs not listed in the `Exports` section.
- Calling `useObservable(item$)` for each item inside the parent `.map()` instead of delegating to a child component — this causes the entire list to re-render on every field change of any single item.
- Observing `collection.loading` in the same component as the item list — loading state changes then re-render the full list.
- Treating `collection.items` as a plain array — it is a `BehaviorSubject<BehaviorSubject<T>[]>` and must be observed at both levels to get correct realtime behavior.

## Build

```bash
bun run build
```

Build output is published from `dist/` and exposed through the package `exports` field.

## Test

```bash
bun test
```

The current test suite covers the React hook behavior that is most sensitive to regressions: observable subscriptions, lazy observable sources, generated context hooks, and async action race handling.

## Agent Guidance

Repository-specific coding-agent guidance lives in `AGENTS.md`, `AGENT_API_GUIDE.md`, and `copilot-instructions.md`.

- `README.md` is end-user documentation.
- `AGENTS.md` is the implementation-focused entry point for coding agents.
- `AGENT_API_GUIDE.md` explains how agents should choose and use each public API when generating code or modifying this package.
