/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test"
import React, { act } from "react"
import { Subject, finalize } from "rxjs"
import { create, type ReactTestRenderer } from "react-test-renderer"
import { useCollection } from "../src/useCollection.js"
import { LivequeryClientProvider } from "../src/LivequeryClientContext.js"

// LivequeryCollection.initialize() bails out under SSR (`typeof window == 'undefined'`).
// bun has no `window`, so expose one before the hook runs.
;(globalThis as any).window ??= globalThis
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// ─── Fake LivequeryClient ─────────────────────────────────────────────────────
// useCollection builds a real LivequeryCollection; initialize() only touches
// client.watch / client.query / client.seedToStorage. We spy on those.

const makeFakeClient = () => {
    const watchedRefs: string[] = []
    const unsubscribedRefs: string[] = []
    const queryCalls: any[] = []
    const subjects: Array<{ ref: string; subject: Subject<any> }> = []

    const client = {
        watch(ref: string, _id: string, _mode: string) {
            watchedRefs.push(ref)
            const subject = new Subject<any>()
            subjects.push({ ref, subject })
            return subject.pipe(finalize(() => unsubscribedRefs.push(ref)))
        },
        async query(req: any) { queryCalls.push(req) },
        async seedToStorage() { },
    }

    return {
        client,
        watchedRefs,
        unsubscribedRefs,
        queryCalls,
        subjects,
        pushLatest(event: any) {
            const latest = subjects[subjects.length - 1]
            act(() => latest!.subject.next(event))
        },
    }
}

const added = (collection_ref: string, id: string, data: Record<string, any> = {}) => ({
    changes: [{ type: "added", id, collection_ref, data: { id, ...data } }],
})

// ─── Render harness (wraps the hook in the client provider) ────────────────────

type CollectionRender = {
    readonly current: any
    setRef: (ref: string | undefined | "" | null | false) => void
    unmount: () => void
}

const renderCollection = (
    client: any,
    initialRef: string | undefined | "" | null | false,
    options: any = { lazy: true },
): CollectionRender => {
    let ref = initialRef
    let current: any
    let renderer: ReactTestRenderer

    const Probe = () => {
        current = useCollection(ref as any, options)
        return null
    }
    const tree = () => (
        <LivequeryClientProvider core={client}>
            <Probe />
        </LivequeryClientProvider>
    )

    act(() => { renderer = create(tree()) })

    return {
        get current() { return current },
        setRef(next) { ref = next; act(() => { renderer.update(tree()) }) },
        unmount() { act(() => { renderer.unmount() }) },
    }
}

// ════════════════════════════════════════════════════════════════════════════

describe("useCollection — initialization", () => {
    test("initializes the collection and subscribes to watch for the ref", () => {
        const fake = makeFakeClient()
        const hook = renderCollection(fake.client, "posts")

        expect(hook.current.ref).toBe("posts")
        expect(fake.watchedRefs).toEqual(["posts"])
        hook.unmount()
    })

    test("falsy ref → no watch, collection left uninitialized", () => {
        for (const falsy of ["", null, false, undefined] as const) {
            const fake = makeFakeClient()
            const hook = renderCollection(fake.client, falsy)
            expect(fake.watchedRefs).toEqual([])
            expect(hook.current.ref).toBeUndefined()
            hook.unmount()
        }
    })

    test("loads data emitted by watch into items", () => {
        const fake = makeFakeClient()
        const hook = renderCollection(fake.client, "posts")
        fake.pushLatest(added("posts", "p1", { title: "A" }))

        expect(hook.current.items.value.map((d: any) => d.value.id)).toEqual(["p1"])
        hook.unmount()
    })
})

describe("useCollection — ref switching", () => {
    test("creates a NEW collection instance when ref changes", () => {
        const fake = makeFakeClient()
        const hook = renderCollection(fake.client, "posts")
        const first = hook.current

        hook.setRef("users")
        const second = hook.current

        expect(second).not.toBe(first)        // fresh instance
        expect(second.ref).toBe("users")
        expect(fake.watchedRefs).toEqual(["posts", "users"])
        hook.unmount()
    })

    test("the new instance starts empty and loads the new ref's data", () => {
        const fake = makeFakeClient()
        const hook = renderCollection(fake.client, "posts")
        fake.pushLatest(added("posts", "p1"))
        expect(hook.current.items.value).toHaveLength(1)

        hook.setRef("users")
        // Fresh instance → no stale data from "posts".
        expect(hook.current.items.value).toHaveLength(0)

        fake.pushLatest(added("users", "u1"))
        expect(hook.current.items.value.map((d: any) => d.value.id)).toEqual(["u1"])
        hook.unmount()
    })

    test("unsubscribes the previous ref's watch when switching", () => {
        const fake = makeFakeClient()
        const hook = renderCollection(fake.client, "posts")
        expect(fake.unsubscribedRefs).toEqual([])

        hook.setRef("users")
        expect(fake.unsubscribedRefs).toEqual(["posts"])
        hook.unmount()
    })

    test("emissions on the OLD subject no longer affect the current collection", () => {
        const fake = makeFakeClient()
        const hook = renderCollection(fake.client, "posts")
        const oldSubject = fake.subjects[0]!.subject

        hook.setRef("users")
        const current = hook.current

        // Old ref's watch is torn down; pushing to it must not touch the new collection.
        act(() => oldSubject.next(added("posts", "ghost")))
        expect(current.items.value).toHaveLength(0)
        hook.unmount()
    })

    test("switching from a real ref to a falsy ref tears down and does not re-init", () => {
        const fake = makeFakeClient()
        const hook = renderCollection(fake.client, "posts")

        hook.setRef("")
        expect(fake.unsubscribedRefs).toEqual(["posts"])
        expect(hook.current.ref).toBeUndefined()
        expect(fake.watchedRefs).toEqual(["posts"]) // no new watch for the falsy ref
        hook.unmount()
    })
})

describe("useCollection — stability", () => {
    test("re-rendering with the SAME ref keeps the same instance and watches once", () => {
        const fake = makeFakeClient()
        const hook = renderCollection(fake.client, "posts")
        const first = hook.current

        hook.setRef("posts") // same ref
        expect(hook.current).toBe(first)
        expect(fake.watchedRefs).toEqual(["posts"])
        hook.unmount()
    })
})

describe("useCollection — lifecycle", () => {
    test("unmount unsubscribes the active watch", () => {
        const fake = makeFakeClient()
        const hook = renderCollection(fake.client, "posts")

        hook.unmount()
        expect(fake.unsubscribedRefs).toEqual(["posts"])
    })

    test("unmount with a falsy ref does not throw", () => {
        const fake = makeFakeClient()
        const hook = renderCollection(fake.client, "")
        expect(() => hook.unmount()).not.toThrow()
    })
})
