# @livequery/react

Thin React bindings for `@livequery/core`.

This repository is the React bindings library package, not an application. Changes here should preserve reusable hook behavior unless a task explicitly targets a breaking change.

This package provides a small set of hooks and helpers for wiring a `LivequeryCore` instance into a React app, subscribing to RxJS streams, and reading collection or document state from `@livequery/core`.

## AI Agent Guidance

Repository-specific agent guidance lives in `AGENTS.md` and `copilot-instructions.md`.

- `AGENTS.md` is the implementation-focused guide for coding agents modifying this package.
- `copilot-instructions.md` provides repo-level instructions for Copilot when generating or reviewing code in this workspace.
- Both documents assume this repo is a React bindings library package, so agent changes should avoid app-specific scaffolding and should preserve public API compatibility by default.
- Agents generating consumer code should create one shared `LivequeryCore`, provide it through `LivequeryCoreProvider`, and subscribe to collection state with `useObservable()`.

## Install

```bash
bun add @livequery/react @livequery/core react rxjs
```

Or with npm:

```bash
npm install @livequery/react @livequery/core react rxjs
```

## Exports

- `LivequeryCoreProvider`
- `useLivequeryCore`
- `useCollection`
- `useDocument`
- `useObservable`
- `useGlobalValue`
- `createContextFromHook`

## Core setup

`useCollection` and `useDocument` read the active `LivequeryCore` instance from `LivequeryCoreProvider`.

```tsx
import { LivequeryCore } from '@livequery/core'
import { LivequeryCoreProvider } from '@livequery/react'

const core = new LivequeryCore({
  endpoint: 'https://your-livequery-server'
})

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LivequeryCoreProvider core={core}>
      {children}
    </LivequeryCoreProvider>
  )
}
```

## useCollection

`useCollection` creates a `LivequeryCollection`, initializes it when `ref` is available, and returns the collection instance.

```tsx
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

  if (loading) return <p>Loading...</p>

  return (
    <ul>
      {items.map((todo) => (
        <li key={todo._id}>{todo.title}</li>
      ))}
    </ul>
  )
}
```

Notes:

- `ref` can be falsy. In that case initialization is skipped.
- The same hook call keeps one collection instance for the lifetime of the component.
- To render stream values, subscribe with `useObservable`.

## useDocument

`useDocument` is a small convenience wrapper built on top of `LivequeryCollection`. It initializes a collection for a single document path and returns `[document, loading]`.

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

## useObservable

`useObservable` bridges an RxJS `Observable` or `BehaviorSubject` into React state.

```tsx
import { BehaviorSubject } from 'rxjs'
import { useObservable } from '@livequery/react'

const counter$ = new BehaviorSubject(0)

export function Counter() {
  const value = useObservable(counter$, 0)
  return <span>{value}</span>
}
```

You can also pass a function when the observable should be resolved lazily.

## useGlobalValue

`useGlobalValue` stores a lazily created singleton on `globalThis`. This is useful when an app should reuse one object across renders or across multiple React roots in the same runtime.

```tsx
import { LivequeryCore } from '@livequery/core'
import { useGlobalValue } from '@livequery/react'

export function useAppCore() {
  return useGlobalValue('livequery-core', () => {
    return new LivequeryCore({
      endpoint: 'https://your-livequery-server'
    })
  })
}
```

## createContextFromHook

`createContextFromHook` is the most distinctive helper in this package. It lets you define shared state once at the provider boundary, but consume it later with an API that still feels like a normal hook.

In practice, it turns this idea:

- "I have some setup logic that depends on provider props"
- "I want descendants to read the computed result through a hook"

into a reusable pattern.

The helper takes one function `fn(props) => value` and returns a tuple:

- `useValue`: reads the current context value
- `Provider`: receives props, calls `fn(props)`, and stores the result in context

That means consumers do not need to know about `React.createContext`, context objects, or provider value wiring. They only call a hook.

### Why this helper is useful

Compared to creating context by hand, `createContextFromHook` removes the repetitive parts:

- creating the context object
- writing a custom consumer hook
- writing a provider that computes and passes `value`

It is especially useful when you want an API that reads like a hook-based service locator, but stays explicit through React providers.

The `LivequeryCoreProvider` and `useLivequeryCore` pair in this package is built from this helper.

### Mental model

You can think of it as turning a factory into two coordinated pieces:

1. A provider-side adapter: `Provider(props)` computes a value from props.
2. A consumer-side hook: `useValue()` reads that computed value from the nearest provider.

So instead of manually writing both pieces every time, you derive them from one source function.

### Example

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

### What happens internally

The generated provider receives props plus `children`, calls your factory with those props, and pushes the returned value into a private React context.

The generated hook simply reads that context and returns the value as type `R`.

This is why the consumer side feels like a plain hook even though the data flow is still standard React context under the hood.

### Good use cases

- exposing a configured client instance such as `LivequeryCore`
- deriving session or auth state from provider props
- wrapping feature-specific state that should be consumed through a single custom hook
- hiding context implementation details from package consumers

### Important behavior notes

- The provider recomputes the value on every render because it directly calls `fn(props)`.
- The consumer hook assumes a provider exists. In the current implementation it casts the context value to `R`, so using the hook outside its provider can result in `undefined` flowing through at runtime.
- `createContextFromHook` does not add memoization by itself. If `fn(props)` is expensive, memoize inside `fn` or stabilize the incoming props.

### Relationship to plain context

If you wrote this manually, the shape would be:

1. create a context
2. write `useX()` that calls `useContext`
3. write `XProvider` that computes a value from props
4. pass that value to the provider

`createContextFromHook` compresses those four steps into one helper and keeps the consuming API ergonomic.

## Build

```bash
bun run build
```

Build output is published from `dist/` and exposed through the package `exports` field.