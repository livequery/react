/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test"
import React, { act } from "react"
import { BehaviorSubject, Observable, Subject } from "rxjs"
import { create, type ReactTestRenderer } from "react-test-renderer"
import { useObservable } from "../src/useObservable.js"

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// ─── Harness ────────────────────────────────────────────────────────────────

type HookRender<T> = {
    readonly current: T
    rerender: () => void
    unmount: () => void
}

const renderHook = <T,>(hook: () => T): HookRender<T> => {
    let current: T
    let renderer: ReactTestRenderer

    const TestComponent = () => {
        current = hook()
        return null
    }

    act(() => {
        renderer = create(<TestComponent />)
    })

    return {
        get current() {
            return current
        },
        rerender() {
            act(() => {
                renderer.update(<TestComponent />)
            })
        },
        unmount() {
            act(() => {
                renderer.unmount()
            })
        },
    }
}

const nextTick = () => new Promise<void>((resolve) => queueMicrotask(resolve))

const emit = async (fn: () => void) => {
    await act(async () => {
        fn()
        await nextTick()
    })
}

// ─── Source factories ─────────────────────────────────────────────────────────

// PB / PO-a: an @livequery/rpc-style Proxy wrapped around a callable that also exposes
// pipe/subscribe/getValue. Seed with a real value for PB, or `null` for PO-a.
const makeProxyWithGetValue = <T,>(subject: BehaviorSubject<T>, onInvoke?: () => void) => {
    const fn = (() => { onInvoke?.(); return subject }) as any
    return new Proxy(fn, {
        get: (_t, prop) =>
            (prop === "pipe" || prop === "subscribe" || prop === "getValue")
                ? (subject as any)[prop].bind(subject)
                : (subject as any)[prop],
    })
}

// PO-b: a Proxy that exposes ONLY pipe/subscribe (no getValue) — a pure observable proxy.
const makeProxyPlain = <T,>(source: Observable<T>, onInvoke?: () => void) => {
    const fn = (() => { onInvoke?.(); return source }) as any
    return new Proxy(fn, {
        get: (_t, prop) =>
            (prop === "pipe" || prop === "subscribe")
                ? (source as any)[prop].bind(source)
                : undefined,
    })
}

// Observable that counts how many times it is subscribed to.
const countingObservable = <T,>(inner: Observable<T>) => {
    let subscriptions = 0
    const obs = new Observable<T>((sub) => {
        subscriptions++
        return inner.subscribe(sub)
    })
    return { obs, subscriptions: () => subscriptions }
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Initial value matrix
// ════════════════════════════════════════════════════════════════════════════

describe("useObservable — initial value", () => {
    test("real BehaviorSubject, no default → current value", () => {
        const hook = renderHook(() => useObservable(new BehaviorSubject(1)))
        expect(hook.current).toBe(1)
        hook.unmount()
    })

    test("real BehaviorSubject with value, with default → value wins over default", () => {
        const hook = renderHook(() => useObservable(new BehaviorSubject(1), 9))
        expect(hook.current).toBe(1)
        hook.unmount()
    })

    test("real BehaviorSubject(null), with default → default", () => {
        const hook = renderHook(() => useObservable(new BehaviorSubject<number | null>(null), 9))
        expect(hook.current).toBe(9)
        hook.unmount()
    })

    test("real BehaviorSubject(null), no default → undefined", () => {
        const hook = renderHook(() => useObservable(new BehaviorSubject<number | null>(null)))
        expect(hook.current).toBeUndefined()
        hook.unmount()
    })

    test("real Observable, no default → undefined", () => {
        const hook = renderHook(() => useObservable(new Subject<number>()))
        expect(hook.current).toBeUndefined()
        hook.unmount()
    })

    test("real Observable, with default → default", () => {
        const hook = renderHook(() => useObservable(new Subject<number>(), 9))
        expect(hook.current).toBe(9)
        hook.unmount()
    })

    test("proxy BehaviorSubject (getValue populated) → getValue value", () => {
        const proxy = makeProxyWithGetValue(new BehaviorSubject({ c: 7 }))
        const hook = renderHook(() => useObservable(proxy as any, { c: 0 }))
        expect(hook.current).toEqual({ c: 7 })
        hook.unmount()
    })

    test("proxy Observable (getValue null), with default → default", () => {
        const proxy = makeProxyWithGetValue(new BehaviorSubject<{ id: string } | null>(null))
        const fallback = { id: "default" }
        const hook = renderHook(() => useObservable(proxy as any, fallback))
        expect(hook.current).toBe(fallback)
        hook.unmount()
    })

    test("proxy Observable (getValue null), no default → undefined", () => {
        const proxy = makeProxyWithGetValue(new BehaviorSubject<{ id: string } | null>(null))
        const hook = renderHook(() => useObservable(proxy as any))
        expect(hook.current).toBeUndefined()
        hook.unmount()
    })

    test("pure proxy Observable (no getValue), with default → default", () => {
        const proxy = makeProxyPlain(new Subject<number>())
        const hook = renderHook(() => useObservable(proxy as any, 9))
        expect(hook.current).toBe(9)
        hook.unmount()
    })

    test("pure proxy Observable (no getValue), no default → undefined", () => {
        const proxy = makeProxyPlain(new Subject<number>())
        const hook = renderHook(() => useObservable(proxy as any))
        expect(hook.current).toBeUndefined()
        hook.unmount()
    })

    test("undefined source, no default → undefined", () => {
        const hook = renderHook(() => useObservable(undefined))
        expect(hook.current).toBeUndefined()
        hook.unmount()
    })

    test("undefined source, with default → default", () => {
        const hook = renderHook(() => useObservable(undefined, 9))
        expect(hook.current).toBe(9)
        hook.unmount()
    })
})

// ════════════════════════════════════════════════════════════════════════════
// 2. Updates on emission
// ════════════════════════════════════════════════════════════════════════════

describe("useObservable — updates on emission", () => {
    test("real BehaviorSubject updates", async () => {
        const subject = new BehaviorSubject(1)
        const hook = renderHook(() => useObservable(subject))
        await emit(() => subject.next(2))
        expect(hook.current).toBe(2)
        hook.unmount()
    })

    test("real Observable receives first emission (no skip)", async () => {
        const subject = new Subject<number>()
        const hook = renderHook(() => useObservable(subject))
        expect(hook.current).toBeUndefined()
        await emit(() => subject.next(5))
        expect(hook.current).toBe(5)
        hook.unmount()
    })

    test("proxy BehaviorSubject updates", async () => {
        const subject = new BehaviorSubject(1)
        const proxy = makeProxyWithGetValue(subject)
        const hook = renderHook(() => useObservable(proxy as any))
        await emit(() => subject.next(3))
        expect(hook.current).toBe(3)
        hook.unmount()
    })

    test("proxy Observable (null seed) updates from default to emitted value", async () => {
        const subject = new BehaviorSubject<{ id: string } | null>(null)
        const proxy = makeProxyWithGetValue(subject)
        const fallback = { id: "default" }
        const hook = renderHook(() => useObservable(proxy as any, fallback))
        expect(hook.current).toBe(fallback)
        await emit(() => subject.next({ id: "real" }))
        expect(hook.current).toEqual({ id: "real" })
        hook.unmount()
    })

    test("last value wins across multiple emissions", async () => {
        const subject = new BehaviorSubject(0)
        const hook = renderHook(() => useObservable(subject))
        await emit(() => { subject.next(1); subject.next(2); subject.next(3) })
        expect(hook.current).toBe(3)
        hook.unmount()
    })
})

// ════════════════════════════════════════════════════════════════════════════
// 3. Null / undefined fallback while running
// ════════════════════════════════════════════════════════════════════════════

describe("useObservable — null/undefined fallback", () => {
    test("BehaviorSubject emits null → falls back to default", async () => {
        const subject = new BehaviorSubject<number | null>(1)
        const hook = renderHook(() => useObservable(subject, 9))
        expect(hook.current).toBe(1)
        await emit(() => subject.next(null))
        expect(hook.current).toBe(9)
        hook.unmount()
    })

    test("proxy emits null repeatedly → stays default, never null", async () => {
        const subject = new BehaviorSubject<{ id: string } | null>(null)
        const proxy = makeProxyWithGetValue(subject)
        const fallback = { id: "default" }
        const hook = renderHook(() => useObservable(proxy as any, fallback))
        await emit(() => subject.next(null))
        expect(hook.current).toBe(fallback)
        hook.unmount()
    })

    test("Observable emits undefined → falls back to default", async () => {
        const subject = new Subject<number | undefined>()
        const hook = renderHook(() => useObservable(subject, 9))
        await emit(() => subject.next(undefined))
        expect(hook.current).toBe(9)
        hook.unmount()
    })

    test("Observable emits undefined without default → undefined", async () => {
        const subject = new Subject<number | undefined>()
        const hook = renderHook(() => useObservable(subject))
        await emit(() => subject.next(undefined))
        expect(hook.current).toBeUndefined()
        hook.unmount()
    })
})

// ════════════════════════════════════════════════════════════════════════════
// 4. Proxy is subscribed, never invoked as a factory
// ════════════════════════════════════════════════════════════════════════════

describe("useObservable — proxy is treated as a source, not a factory", () => {
    test("proxy with getValue is subscribed, never called", () => {
        let invoked = false
        const proxy = makeProxyWithGetValue(new BehaviorSubject("ok"), () => { invoked = true })
        const hook = renderHook(() => useObservable(proxy as any))
        expect(invoked).toBe(false)
        expect(hook.current).toBe("ok")
        hook.unmount()
    })

    test("pure proxy observable is subscribed, never called", async () => {
        let invoked = false
        const subject = new Subject<number>()
        const proxy = makeProxyPlain(subject, () => { invoked = true })
        const hook = renderHook(() => useObservable(proxy as any))
        await emit(() => subject.next(5))
        expect(invoked).toBe(false)
        expect(hook.current).toBe(5)
        hook.unmount()
    })
})

// ════════════════════════════════════════════════════════════════════════════
// 5. Lazy factory `() => source`
// ════════════════════════════════════════════════════════════════════════════

describe("useObservable — lazy factory", () => {
    test("factory → real BehaviorSubject", async () => {
        const subject = new BehaviorSubject(1)
        const hook = renderHook(() => useObservable(() => subject))
        expect(hook.current).toBe(1)
        await emit(() => subject.next(2))
        expect(hook.current).toBe(2)
        hook.unmount()
    })

    test("factory → real Observable", async () => {
        const subject = new Subject<number>()
        const hook = renderHook(() => useObservable(() => subject, 9))
        expect(hook.current).toBe(9)
        await emit(() => subject.next(5))
        expect(hook.current).toBe(5)
        hook.unmount()
    })

    test("factory → proxy BehaviorSubject", async () => {
        const subject = new BehaviorSubject(7)
        const proxy = makeProxyWithGetValue(subject)
        const hook = renderHook(() => useObservable(() => proxy as any))
        expect(hook.current).toBe(7)
        await emit(() => subject.next(8))
        expect(hook.current).toBe(8)
        hook.unmount()
    })

    test("factory → undefined, with default → default (no crash)", () => {
        const hook = renderHook(() => useObservable(() => undefined, 5))
        expect(hook.current).toBe(5)
        hook.unmount()
    })

    test("factory → undefined, no default → undefined (no crash)", () => {
        const hook = renderHook(() => useObservable(() => undefined))
        expect(hook.current).toBeUndefined()
        hook.unmount()
    })

    test("subscribes exactly once when the factory ref changes every render", () => {
        const { obs, subscriptions } = countingObservable(new BehaviorSubject(10))
        const hook = renderHook(() => useObservable(() => obs))
        expect(hook.current).toBe(10)
        hook.rerender()
        hook.rerender()
        expect(subscriptions()).toBe(1)
        hook.unmount()
    })

    test("does not re-resolve when the factory closure changes (resolve-once)", () => {
        const first = new BehaviorSubject("a")
        const other = new BehaviorSubject("b")
        let useOther = false
        const hook = renderHook(() => useObservable(() => (useOther ? other : first)))
        expect(hook.current).toBe("a")
        useOther = true
        hook.rerender()
        expect(hook.current).toBe("a") // still the first-resolved source
        hook.unmount()
    })

    test("factory is invoked only once across rerenders", () => {
        let calls = 0
        const subject = new BehaviorSubject(1)
        const hook = renderHook(() => useObservable(() => { calls++; return subject }))
        expect(calls).toBe(1)
        hook.rerender()
        hook.rerender()
        expect(calls).toBe(1)
        hook.unmount()
    })
})

// ════════════════════════════════════════════════════════════════════════════
// 6. Source switching (direct mode)
// ════════════════════════════════════════════════════════════════════════════

describe("useObservable — source switching", () => {
    test("switching BehaviorSubject A → B picks up B's current value", () => {
        let src = new BehaviorSubject(1)
        const hook = renderHook(() => useObservable(src))
        expect(hook.current).toBe(1)
        src = new BehaviorSubject(2)
        hook.rerender()
        expect(hook.current).toBe(2)
        hook.unmount()
    })

    test("switching source unsubscribes the previous one", () => {
        let torndown = false
        const aInner = new BehaviorSubject(1)
        const a = new Observable<number>((sub) => {
            const s = aInner.subscribe(sub)
            return () => { torndown = true; s.unsubscribe() }
        })
        let src: Observable<number> = a
        const hook = renderHook(() => useObservable(src))
        expect(hook.current).toBe(1)

        src = new BehaviorSubject(2)
        hook.rerender()

        expect(torndown).toBe(true)
        expect(hook.current).toBe(2)
        hook.unmount()
    })

    test("undefined → real source starts working", () => {
        let src: BehaviorSubject<number> | undefined = undefined
        const hook = renderHook(() => useObservable(src))
        expect(hook.current).toBeUndefined()
        src = new BehaviorSubject(3)
        hook.rerender()
        expect(hook.current).toBe(3)
        hook.unmount()
    })

    test("real source → undefined keeps the last value and does not crash", () => {
        let src: BehaviorSubject<number> | undefined = new BehaviorSubject(5)
        const hook = renderHook(() => useObservable(src))
        expect(hook.current).toBe(5)
        src = undefined
        hook.rerender()
        expect(hook.current).toBe(5)
        hook.unmount()
    })
})

// ════════════════════════════════════════════════════════════════════════════
// 7. Lifecycle / leaks
// ════════════════════════════════════════════════════════════════════════════

describe("useObservable — lifecycle", () => {
    test("unmount unsubscribes", () => {
        let torndown = false
        const inner = new BehaviorSubject(1)
        const obs = new Observable<number>((sub) => {
            const s = inner.subscribe(sub)
            return () => { torndown = true; s.unsubscribe() }
        })
        const hook = renderHook(() => useObservable(obs))
        hook.unmount()
        expect(torndown).toBe(true)
    })

    test("emitting after unmount does not throw", () => {
        const subject = new BehaviorSubject(1)
        const hook = renderHook(() => useObservable(subject))
        hook.unmount()
        expect(() => subject.next(2)).not.toThrow()
    })

    test("unmount before any emission (cold Observable) does not throw", () => {
        const subject = new Subject<number>()
        const hook = renderHook(() => useObservable(subject))
        expect(() => hook.unmount()).not.toThrow()
    })
})

// ════════════════════════════════════════════════════════════════════════════
// 8. Identity / misc
// ════════════════════════════════════════════════════════════════════════════

describe("useObservable — identity", () => {
    test("returns the exact default reference while loading", () => {
        const fallback = { id: "x" }
        const hook = renderHook(() => useObservable(new Subject<{ id: string }>(), fallback))
        expect(hook.current).toBe(fallback)
        hook.unmount()
    })

    test("hot Subject delivers values emitted after subscription", async () => {
        const subject = new Subject<string>()
        const hook = renderHook(() => useObservable(subject))
        await emit(() => subject.next("first"))
        await emit(() => subject.next("second"))
        expect(hook.current).toBe("second")
        hook.unmount()
    })
})
