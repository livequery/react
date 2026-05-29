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
import { LivequeryClient, LivequeryMemoryStorage } from '@livequery/client'
import { RestTransporter } from '@livequery/rest'
import { LivequeryClientProvider } from '@livequery/react'

const client = new LivequeryClient({
  storage: new LivequeryMemoryStorage(),
  transporters: {
    rest: new RestTransporter({
      api: 'https://your-livequery-server',
      ws: 'wss://your-livequery-server/ws',
    }),
  },
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

### SharedWorker

If your app uses a SharedWorker via `@livequery/rpc`, the setup inside the worker is different — but from React's perspective nothing changes. You still construct a `LivequeryClient` and pass it to `LivequeryClientProvider` exactly as shown above. Read the `@livequery/rpc` documentation for how to expose the client from a SharedWorker; the React layer stays the same.

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
import { useCollection, useObservable } from '@livequery/react'

type Todo = {
  _id: string
  title: string
  done: boolean
}

export function TodoList() {
  // lazy: false — collection queries automatically on initialization
  const collection = useCollection<Todo>('todos', { lazy: false })
  const items = useObservable(collection.items, [])
  const loading = useObservable(collection.loading, false)
  const error = useObservable(collection.error)

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

When `lazy: false`, the collection queries automatically when initialized — no `useEffect` or manual `collection.query()` call is needed. Use `lazy: true` (the default) when you need to control when the query fires, such as after user interaction or after other async setup completes.

Behavior notes:

- `ref` may be `undefined`, `null`, `false`, or an empty string. Falsy refs skip initialization.
- The same hook call keeps one collection instance for the lifetime of the component.
- `options` are used when that collection instance is first created. Pass stable options, or remount the hook if options need to change.
- Subscribe to fields such as `collection.items`, `collection.loading`, and `collection.error` with `useObservable()`.
- Do not call `query()`, `add()`, `update()`, or `delete()` directly during render.

## `useDocument`

`useDocument<T>(ref, options)` is a document-focused convenience wrapper over `useCollection()`.

It initializes a collection for a document ref, subscribes to collection items, loading state, and error state, then returns `[items[0], loading, error]`.

Use it when a component only needs one document, a loading flag, and basic error handling.

```tsx
import { useDocument } from '@livequery/react'

type Todo = {
  id: string
  title: string
  done: boolean
}

export function TodoDetail({ id }: { id: string }) {
  const [todo, loading, error] = useDocument<Todo>(`todos/${id}`)

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>
  if (!todo) return <p>Not found</p>

  return <h1>{todo.value.title}</h1>
}
```

The return tuple:

| Index | Type | Value |
|---|---|---|
| `0` | `LivequeryDocument<DocState<T>> \| undefined` | The first document in the collection, or `undefined` when not yet loaded |
| `1` | `LivequeryLoadingState \| null` | Loading state: `null` when idle, `"all"` while the query is in flight |
| `2` | `{ code: string; message: string } \| null` | Error from the last query, or `null` when no error |

Use `useCollection()` instead when you need collection methods, multiple documents, or more control over subscriptions.

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
- Lazy sources are resolved once for the hook lifetime. The source function is called only on the first render and is not re-called if the function reference changes later. If you need a different source, the component must remount.
- If the source is `undefined`, the hook returns the default value, or `undefined` if no default was provided.
- Reading `.value` or `.getValue()` manually in render is not a replacement for `useObservable()` because it will not subscribe the component to future emissions.

## 7 Rules for Using @livequery/react

These rules are mandatory. Breaking any one of them causes unnecessary re-renders, unhandled errors, or hard-to-debug state bugs.

### Why two levels?

`collection.items` is a `BehaviorSubject<LivequeryDocument<T>[]>`.

- The **outer** `BehaviorSubject` emits a new array only when items are added, removed, or reordered.
- Each **element** is a `LivequeryDocument<T>` — itself a `BehaviorSubject<DocState<T>>` — that emits when that specific document's fields change.
- A field update on one document does **not** cause the outer array to emit. Only that document's own subject emits.

This means re-renders can be scoped to exactly the component that owns the changed data — but only if you follow the rules below.

---

### Rule 1 — `LivequeryClientProvider` is required

Every hook in this package reads the nearest `LivequeryClient` from context. There is no fallback. Using any hook outside a provider throws `Context provider is missing`.

```tsx
// app root or route boundary
<LivequeryClientProvider core={client}>
  <YourApp />
</LivequeryClientProvider>
```

Create one client per data boundary, not one per component. The client holds the connection and cache — recreating it on every render loses all state.

---

### Rule 2 — SharedWorker: setup differs, React API stays the same

If your app runs `@livequery/client` inside a SharedWorker via `@livequery/rpc`, the worker setup is different. From React's perspective nothing changes — you still receive a `LivequeryClient` and pass it to `LivequeryClientProvider` exactly as normal. Read the `@livequery/rpc` docs for the worker side.

---

### Rule 3 — Place `useCollection` in the component that owns the list

`useCollection` belongs in the component that renders the list with `.map()`. Do not call it in a parent and pass the collection down as a prop — the collection is created once for that component's lifetime.

```tsx
// ✓ correct — useCollection lives where the list is rendered
export function TodoList() {
  const collection = useCollection<Todo>('todos', { lazy: false })
  const items = useObservable(collection.items, [])
  return <ul>{items.map(item => <TodoItem key={item.value.id} item={item} />)}</ul>
}

// ✗ wrong — collection created in parent, passed as prop
export function Parent() {
  const collection = useCollection<Todo>('todos')
  return <TodoList collection={collection} />
}
```

---

### Rule 4 — Unwrap `items` with `useObservable`

`collection.items` is a `BehaviorSubject`. You must subscribe to it with `useObservable` to get the current array and re-render when items are added, removed, or reordered.

```tsx
const items = useObservable(collection.items, [])
// items: LivequeryDocument<Todo>[]
// re-renders ONLY when count or order changes — not on field updates
```

Never read `collection.items.value` directly in render. It gives a snapshot that does not update.

---

### Rule 5 — Never call `.value` or `.getValue()` inside `.map()` — delegate to a child component

Each element of `items` is a `LivequeryDocument<T>` (a `BehaviorSubject`). Calling `.value` or `.getValue()` inside the parent map reads the value once — it does not subscribe, so field changes will not re-render.

Pass the document to a child component and call `useObservable` inside:

```tsx
// ✗ wrong — reads once, misses future field updates
{items.map(item => <li key={item.value.id}>{item.value.title}</li>)}

// ✗ also wrong — useObservable in parent map re-renders the whole list on any field change
{items.map(item => {
  const todo = useObservable(item)
  return <li key={todo.id}>{todo.title}</li>
})}

// ✓ correct — field updates re-render only TodoItem, not the list
{items.map(item => <TodoItem key={item.value.id} item={item} />)}

function TodoItem({ item }: { item: LivequeryDocument<Todo> }) {
  const todo = useObservable(item)  // subscribes inside the child
  return <li>{todo.title}</li>
}
```

---

### Rule 6 — `loading`, `paging`, and `summary` also belong in separate child components

`collection.loading`, `collection.paging`, and `collection.summary` are all `BehaviorSubject`s. Calling `useObservable` on them in the same component as `items` means every loading toggle or paging update re-renders the entire list.

```tsx
// ✗ wrong — loading change re-renders the full list
export function TodoList() {
  const collection = useCollection<Todo>('todos', { lazy: false })
  const items = useObservable(collection.items, [])
  const loading = useObservable(collection.loading)   // ← causes full re-render on change
  const paging = useObservable(collection.paging)     // ← same
  ...
}

// ✓ correct — each subject in its own component
function TodoLoading({ loading$ }: { loading$: LivequeryCollection<Todo>['loading'] }) {
  const loading = useObservable(loading$)
  if (!loading) return null
  return <p>Loading...</p>
}

function TodoPaging({ paging$ }: { paging$: LivequeryCollection<Todo>['paging'] }) {
  const paging = useObservable(paging$)
  return <p>{paging.current} / {paging.total}</p>
}

function TodoSummary({ summary$ }: { summary$: LivequeryCollection<Todo>['summary'] }) {
  const summary = useObservable(summary$)
  return <p>Open: {summary.open}</p>
}
```

---

### Full compliant example

```tsx
import { LivequeryDocument } from '@livequery/client'
import { useCollection, useObservable } from '@livequery/react'

type Todo = { id: string; title: string; done: boolean }

function TodoItem({ item }: { item: LivequeryDocument<Todo> }) {
  const todo = useObservable(item)
  return (
    <li>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => item.update({ done: !todo.done })}
      />
      {todo.title}
      {todo._updating && ' Saving…'}
    </li>
  )
}

function TodoLoading({ loading$ }: { loading$: LivequeryCollection<Todo>['loading'] }) {
  const loading = useObservable(loading$)
  return loading ? <p>Loading…</p> : null
}

function TodoPaging({ paging$, onMore }: { paging$: LivequeryCollection<Todo>['paging'], onMore: () => void }) {
  const paging = useObservable(paging$)
  if (!paging.next) return null
  return <button onClick={onMore}>Load more ({paging.total - paging.current} left)</button>
}

export function TodoList() {
  const collection = useCollection<Todo>('todos', { lazy: false })
  const items = useObservable(collection.items, [])

  return (
    <>
      <TodoLoading loading$={collection.loading} />
      <ul>
        {items.map(item => (
          <TodoItem key={item.value.id} item={item} />
        ))}
      </ul>
      <TodoPaging paging$={collection.paging} onMore={() => collection.loadMore()} />
    </>
  )
}
```

---

### Rule 7 — Wrap every action in `useAction`

Any call to `collection.add()`, `collection.update()`, `collection.delete()`, `collection.trigger()`, `item.update()`, `item.del()`, or `item.trigger()` is an async operation that can fail. Calling these directly in an event handler means:

- No loading state — UI has no way to show a spinner or disable the button
- No error state — a rejected promise becomes an unhandled exception that can crash the component
- Race conditions — two rapid clicks fire two concurrent calls with no guard

Wrap every action in `useAction` to get `loading`, `data`, and `error` as React state, with automatic race protection (only the latest call updates state).

`useAction` holds state (`loading`, `data`, `error`) that changes every time the action is called. Place it in the **same component as the button**, never in the component that owns `items`. If `useAction` lives in the list parent, every action call re-renders the entire list.

```tsx
// ✗ wrong — unhandled rejection, no loading state, can crash
function AddButton({ collection }: { collection: LivequeryCollection<Todo> }) {
  return (
    <button onClick={() => collection.add({ title: 'New', done: false })}>
      Add
    </button>
  )
}

// ✗ also wrong — useAction in the list parent re-renders the whole list on every call
function TodoList() {
  const collection = useCollection<Todo>('todos', { lazy: false })
  const add = useAction(() => collection.add({ title: 'New', done: false })) // ← wrong place
  const items = useObservable(collection.items, [])
  return (
    <>
      <button onClick={() => void add()}>Add</button>
      <ul>{items.map(item => <TodoItem key={item.value.id} item={item} />)}</ul>
    </>
  )
}

// ✓ correct — useAction lives in its own button component, list never re-renders for it
function AddButton({ collection }: { collection: LivequeryCollection<Todo> }) {
  const add = useAction(() => collection.add({ title: 'New', done: false }))

  return (
    <>
      <button disabled={add.loading} onClick={() => void add()}>
        {add.loading ? 'Adding…' : 'Add'}
      </button>
      {add.error && <p>Error: {add.error.message}</p>}
    </>
  )
}

function TodoList() {
  const collection = useCollection<Todo>('todos', { lazy: false })
  const items = useObservable(collection.items, [])
  return (
    <>
      <AddButton collection={collection} />
      <ul>{items.map(item => <TodoItem key={item.value.id} item={item} />)}</ul>
    </>
  )
}
```

The same applies to document-level actions:

```tsx
function TodoItem({ item }: { item: LivequeryDocument<Todo> }) {
  const todo = useObservable(item)

  const toggle = useAction(() => item.update({ done: !todo.done }))
  const remove = useAction(() => item.del())
  const archive = useAction(() => item.trigger('archive'))

  return (
    <li>
      <input type="checkbox" checked={todo.done} disabled={toggle.loading} onChange={() => void toggle()} />
      {todo.title}
      <button disabled={remove.loading} onClick={() => void remove()}>
        {remove.loading ? 'Deleting…' : 'Delete'}
      </button>
      {toggle.error && <span>Save failed: {toggle.error.code}</span>}
      {remove.error && <span>Delete failed: {remove.error.code}</span>}
    </li>
  )
}
```

And for collection triggers:

```tsx
function ArchiveAllButton({ collection }: { collection: LivequeryCollection<Todo> }) {
  const archive = useAction(
    () => collection.trigger<{ count: number }>('archive-done'),
    { onError: (e) => console.error('Archive failed', e) }
  )

  return (
    <>
      <button disabled={archive.loading} onClick={() => void archive()}>
        {archive.loading ? 'Archiving…' : 'Archive done'}
      </button>
      {archive.data && <p>Archived {archive.data.count} items</p>}
    </>
  )
}
```

`useAction` accepts any async function, so it works for non-Livequery async operations too (form submissions, file uploads, etc.).

---

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

## `useCollection` vs `useDocument`

**Use `useCollection` when you need a list (plural).**
**Use `useDocument` when you need one item (singular).**

```tsx
// list — collection ref has an odd number of segments
const collection = useCollection<Todo>('todos')
const collection = useCollection<Post>('users/u1/posts')

// single document — document ref has an even number of segments
const [todo, loading, error] = useDocument<Todo>('todos/todo-1')
const [post, loading, error] = useDocument<Post>('users/u1/posts/post-1')
```

`useDocument` is a thin wrapper over `useCollection`. Under the hood it creates the same collection but exposes only `[firstItem, loading, error]`. Use `useCollection` when you need methods like `add`, `update`, `delete`, `sort`, or `loadMore`. Use `useDocument` when you only need to read or mutate one document through `item.update()` and `item.del()`.

---

## TypeScript

### Define your document type with `Doc`

Import `Doc` from `@livequery/client` and extend it. Every document must have an `id: string` field — `Doc<T>` adds it automatically.

```tsx
import type { Doc } from '@livequery/client'

type Todo = Doc<{
  title: string
  done: boolean
  createdAt: number
}>

// use the type with hooks
const collection = useCollection<Todo>('todos')
const [todo] = useDocument<Todo>('todos/todo-1')
```

### Import types, not values

Only import types from `@livequery/client` in component files — the runtime objects (`LivequeryClient`, `LivequeryCollection`) live in your setup files, not in every component.

```tsx
// ✓ correct — type-only imports in components
import type { Doc, DocState, LivequeryDocument, LivequeryCollection } from '@livequery/client'

// ✗ wrong — importing runtime values you don't construct here
import { LivequeryClient, LivequeryCollection } from '@livequery/client'
```

### Type props that receive collection or document

```tsx
import type { LivequeryCollection, LivequeryDocument, Doc } from '@livequery/client'

type Todo = Doc<{ title: string; done: boolean }>

// list component receives a typed collection
function TodoList({ collection }: { collection: LivequeryCollection<Todo> }) { ... }

// item component receives a typed document subject
function TodoItem({ item }: { item: LivequeryDocument<Todo> }) { ... }
```

---

## Document States

Every document in `items` is a `DocState<T>` which includes internal fields set by the client during optimistic mutations. Use these to show pending and error states in the UI.

| Field | When set | What to show |
|---|---|---|
| `_adding` | `local-first` add in progress | "Saving…", spinner, disable form |
| `_adding_error` | Server rejected the add | Error message, retry button |
| `_updating` | `local-first` update in progress | "Saving…", field disabled |
| `_updating_error` | Server rejected the update | Error message next to the field |
| `_deleting` | `local-first` delete in progress | Row dimmed, "Deleting…" |
| `_deleting_error` | Server rejected the delete | Error message, undo button |
| `_local_only` | Created with `local-only` mode | "Draft", "Unsaved" badge |

```tsx
function TodoItem({ item }: { item: LivequeryDocument<Todo> }) {
  const todo = useObservable(item)

  const toggle = useAction(() => item.update({ done: !todo.done }))
  const remove = useAction(() => item.del())

  return (
    <li style={{ opacity: todo._deleting ? 0.4 : 1 }}>
      <input
        type="checkbox"
        checked={todo.done}
        disabled={toggle.loading || !!todo._updating}
        onChange={() => void toggle()}
      />

      <span>{todo.title}</span>

      {todo._local_only && <span className="badge">Draft</span>}
      {todo._updating && <span>Saving…</span>}
      {todo._updating_error && <span>Save failed: {todo._updating_error.message}</span>}

      <button disabled={remove.loading} onClick={() => void remove()}>
        {todo._deleting ? 'Deleting…' : 'Delete'}
      </button>
      {todo._deleting_error && <span>Delete failed — {todo._deleting_error.message}</span>}
    </li>
  )
}
```

Note: `_adding`, `_updating`, `_deleting` are set by `@livequery/client` during optimistic mutations. They are cleared automatically when the server responds. You do not need to manage them manually.

---

## Common Patterns

### Conditional ref — wait for ID or auth before initializing

Pass a falsy value as `ref` to skip initialization. The collection stays empty with no loading state until `ref` becomes truthy.

```tsx
function UserTodos({ userId }: { userId: string | null }) {
  // does not initialize until userId is available
  const collection = useCollection<Todo>(userId && `users/${userId}/todos`, { lazy: false })
  const items = useObservable(collection.items, [])
  return <ul>{items.map(item => <TodoItem key={item.value.id} item={item} />)}</ul>
}
```

Accepted falsy values: `undefined`, `null`, `false`, `''`. Any of these skips `initialize()`.

---

### Search with debounce — filter without calling server on every keystroke

Create the collection with a `debounce` value (milliseconds), then call `debounceQuery` on every input change. The actual query fires only after the user stops typing.

```tsx
function TodoSearch() {
  const collection = useCollection<Todo>('todos', { debounce: 300 })
  const items = useObservable(collection.items, [])

  return (
    <>
      <input
        placeholder="Search…"
        onChange={e => collection.debounceQuery({ 'title:like': e.target.value })}
      />
      <ul>{items.map(item => <TodoItem key={item.value.id} item={item} />)}</ul>
    </>
  )
}
```

`debounceQuery` does nothing unless the collection was created with `debounce: <ms>`.

---

### Pagination — load more / infinite scroll

Use `collection.paging` to check whether more pages are available, then call `loadMore()`. Put the button and paging state in their own component so page changes do not re-render the list.

```tsx
function TodoPaging({ collection }: { collection: LivequeryCollection<Todo> }) {
  const paging = useObservable(collection.paging)
  const loadMore = useAction(() => collection.loadMore())

  if (!paging?.next) return null

  return (
    <button disabled={loadMore.loading} onClick={() => void loadMore()}>
      {loadMore.loading ? 'Loading…' : `Load more (${paging.total - paging.current} left)`}
    </button>
  )
}

function TodoList() {
  const collection = useCollection<Todo>('todos', { lazy: false })
  const items = useObservable(collection.items, [])

  return (
    <>
      <ul>{items.map(item => <TodoItem key={item.value.id} item={item} />)}</ul>
      <TodoPaging collection={collection} />
    </>
  )
}
```

`loadMore()` appends results — it does not replace `items`. Use `loadPrev()` for the previous page.

---

### Mutations without querying (lazy collection)

Use `lazy: true` (the default) when you only need `add`, `update`, or `delete` and do not need the query results in this component. The collection is initialized but does not fire a query, so no network request is made and no items are loaded.

```tsx
// A floating "Add" button that writes to a collection without reading it
function AddTodoButton() {
  const collection = useCollection<Todo>('todos') // lazy: true by default — no query
  const add = useAction(() => collection.add({ title: 'New todo', done: false }))

  return (
    <button disabled={add.loading} onClick={() => void add()}>
      {add.loading ? 'Adding…' : 'Add Todo'}
    </button>
  )
}
```

This avoids an unnecessary fetch. The collection is still connected to the client, so any local-only items you add will be visible to other collection instances on the same client that _do_ query the same ref.

> **Always wrap mutations in `useAction`** — it gives you `loading`, `error`, and race protection with no extra code.

---

### Automatic cleanup

`useCollection` registers a subscription with the client on mount and unsubscribes automatically on unmount. You do not need to write any cleanup code.

```tsx
// this is enough — no useEffect cleanup needed
const collection = useCollection<Todo>('todos', { lazy: false })
// ↑ subscribes on mount, unsubscribes on unmount automatically
```

---

## Choosing The Right API

- Use `LivequeryClientProvider` once near the app or data boundary.
- Use `useLivequeryClient()` only when you need direct client access.
- Use `useCollection()` when rendering a list or when you need collection methods.
- Use `useDocument()` when you need a single document — it returns `[doc, loading, error]`.
- Use `useObservable()` whenever an RxJS source should drive rendering.
- Use `useAction()` for every async action — never call mutations directly in event handlers.
- Use `createContextFromHook()` for package or app utilities that should expose provider plus hook pairs.

## Common Mistakes

- Creating a new `LivequeryClient` inside a component render.
- Calling collection mutations directly during render.
- Reading `BehaviorSubject` values manually and expecting rerenders.
- Passing changing `useCollection()` options and expecting the existing collection instance to rebuild.
- Using `useCollection()` when `useDocument()` is sufficient — `useDocument` now returns `[doc, loading, error]` and handles the common case.
- Using `useDocument()` when you need collection methods (`add`, `update`, `delete`, `sort`, `loadMore`). For mutations, use `useCollection()` and get the document from `collection.items.value[0]`.
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
