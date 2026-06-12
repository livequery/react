/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test"
import React, { act } from "react"
import { of } from "rxjs"
import { create, type ReactTestRenderer } from "react-test-renderer"
import {
    LivequeryClient,
    LivequeryMemoryStorage,
    type Doc,
    type LivequeryTransporter,
} from "@livequery/client"
import { useCollection } from "../src/useCollection.js"
import { useObservable } from "../src/useObservable.js"
import { LivequeryClientProvider } from "../src/LivequeryClientContext.js"

;(globalThis as any).window ??= globalThis
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Todo = Doc & { title: string }

// Transporter that returns different items depending on the queried ref.
const itemsByRef: Record<string, Todo[]> = {
    posts: [{ id: "p1", title: "Post 1" }],
    users: [{ id: "u1", title: "User 1" }],
}

function makeClient() {
    const transporter: LivequeryTransporter = {
        query: (e: any) => of({
            changes: (itemsByRef[e.ref] || []).map((doc) => ({
                collection_ref: e.ref,
                id: doc.id,
                type: "added" as const,
                data: doc,
            })),
            paging: { current: 1, total: 1 },
            source: "query" as const,
            loading: null,
        }),
        add: async () => ({} as any),
        update: async () => ({} as any),
        delete: async () => ({} as any),
        trigger: async () => ({} as any),
    }
    return new LivequeryClient({
        storage: new LivequeryMemoryStorage(),
        transporters: { primary: transporter },
    })
}

const tick = (ms = 30) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

describe("useCollection — ref change reload (integration with real client)", () => {
    test("switching ref reloads items from the new ref", async () => {
        const client = makeClient()
        let ref = "posts"
        let ids: string[] = []
        let renderer: ReactTestRenderer

        const Probe = () => {
            const collection = useCollection<Todo>(ref, { lazy: false })
            const items = useObservable(collection.items, [])
            ids = items.map((d: any) => d.value.id)
            return null
        }
        const tree = () => (
            <LivequeryClientProvider core={client}>
                <Probe />
            </LivequeryClientProvider>
        )

        act(() => { renderer = create(tree()) })
        await tick()
        expect(ids).toEqual(["p1"]) // loaded posts

        // change ref → expect a reload to users
        ref = "users"
        act(() => { renderer.update(tree()) })
        await tick()
        expect(ids).toEqual(["u1"]) // should now show users, NOT posts

        act(() => { renderer.unmount() })
    })

    test("stable client + same ref across re-renders → collection NOT recreated", async () => {
        const client = makeClient()
        const seen = new Set<any>()
        let renderer: ReactTestRenderer

        const Probe = () => {
            const collection = useCollection<Todo>("posts", { lazy: false })
            seen.add(collection)
            return null
        }
        const tree = () => (
            <LivequeryClientProvider core={client}>
                <Probe />
            </LivequeryClientProvider>
        )

        act(() => { renderer = create(tree()) })
        await tick()
        act(() => { renderer.update(tree()) })
        act(() => { renderer.update(tree()) })
        await tick()

        // Same client + same ref → exactly one collection instance over the lifetime.
        expect(seen.size).toBe(1)
        act(() => { renderer.unmount() })
    })

    test("robust against an UNSTABLE client: same ref → collection NOT recreated", async () => {
        const seen = new Set<any>()
        let renderer: ReactTestRenderer

        // Anti-pattern: a fresh client object on every render (e.g. created inline in the provider).
        // Because useCollection keys the memo on `ref` only (not client identity), the collection
        // must stay stable across renders as long as the ref does not change.
        const Probe = () => {
            const collection = useCollection<Todo>("posts", { lazy: false })
            seen.add(collection)
            return null
        }
        const tree = () => (
            <LivequeryClientProvider core={makeClient()}>
                <Probe />
            </LivequeryClientProvider>
        )

        act(() => { renderer = create(tree()) })
        await tick()
        act(() => { renderer.update(tree()) })
        await tick()
        act(() => { renderer.update(tree()) })
        await tick()

        expect(seen.size).toBe(1)
        act(() => { renderer.unmount() })
    })

    test("unmount + remount reloads data", async () => {
        const client = makeClient()
        let ids: string[] = []
        let renderer: ReactTestRenderer
        let shown = true

        const Inner = () => {
            const collection = useCollection<Todo>("posts", { lazy: false })
            const items = useObservable(collection.items, [])
            ids = items.map((d: any) => d.value.id)
            return null
        }
        const tree = () => (
            <LivequeryClientProvider core={client}>
                {shown ? <Inner key="inner" /> : null}
            </LivequeryClientProvider>
        )

        act(() => { renderer = create(tree()) })
        await tick()
        expect(ids).toEqual(["p1"])  // initial load

        // Unmount
        shown = false
        act(() => { renderer.update(tree()) })

        // Remount
        shown = true
        act(() => { renderer.update(tree()) })
        await tick()
        expect(ids).toEqual(["p1"])  // must reload after remount

        act(() => { renderer.unmount() })
    })

    test("items do not retain stale data from the previous ref", async () => {
        const client = makeClient()
        let ref = "posts"
        let ids: string[] = []
        let renderer: ReactTestRenderer

        const Probe = () => {
            const collection = useCollection<Todo>(ref, { lazy: false })
            const items = useObservable(collection.items, [])
            ids = items.map((d: any) => d.value.id)
            return null
        }
        const tree = () => (
            <LivequeryClientProvider core={client}>
                <Probe />
            </LivequeryClientProvider>
        )

        act(() => { renderer = create(tree()) })
        await tick()
        expect(ids).toEqual(["p1"])

        ref = "users"
        act(() => { renderer.update(tree()) })
        await tick()
        // must not contain p1
        expect(ids).not.toContain("p1")
        expect(ids).toEqual(["u1"])

        act(() => { renderer.unmount() })
    })
})
