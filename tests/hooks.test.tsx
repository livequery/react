/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test"
import React, { act } from "react"
import { BehaviorSubject } from "rxjs"
import { create, type ReactTestRenderer } from "react-test-renderer"
import { createContextFromHook } from "../src/createContextFromHook.js"
import { useAction } from "../src/useAction.js"
import { useObservable } from "../src/useObservable.js"

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

describe("useObservable", () => {
    test("reads BehaviorSubject initial value and updates on emissions", async () => {
        const subject = new BehaviorSubject(1)
        const hook = renderHook(() => useObservable(subject))

        expect(hook.current).toBe(1)

        await act(async () => {
            subject.next(2)
            await nextTick()
        })

        expect(hook.current).toBe(2)
        hook.unmount()
    })

    test("resolves lazy observable sources once", async () => {
        const subject = new BehaviorSubject("initial")
        let calls = 0
        const hook = renderHook(() => useObservable(() => {
            calls += 1
            return subject
        }))

        expect(calls).toBe(1)
        expect(hook.current).toBe("initial")

        hook.rerender()
        expect(calls).toBe(1)

        await act(async () => {
            subject.next("next")
            await nextTick()
        })

        expect(hook.current).toBe("next")
        hook.unmount()
    })
})

describe("createContextFromHook", () => {
    test("provides the factory value to descendants", () => {
        const [useValue, Provider] = createContextFromHook(({ value }: { value: string }) => value)
        let current: string | undefined
        let renderer: ReactTestRenderer

        const Consumer = () => {
            current = useValue()
            return null
        }

        act(() => {
            renderer = create(
                <Provider value="provided">
                    <Consumer />
                </Provider>
            )
        })

        expect(current).toBe("provided")

        act(() => {
            renderer.unmount()
        })
    })

    test("throws when consumed outside its provider", () => {
        const [useValue] = createContextFromHook(() => "value")

        expect(() => {
            renderHook(() => useValue())
        }).toThrow("Context provider is missing")
    })
})

describe("useAction", () => {
    test("only the latest in-flight call can update state", async () => {
        const pending: Array<{ resolve: (value: string) => void }> = []
        const hook = renderHook(() => useAction(async () => {
            return await new Promise<string>((resolve) => {
                pending.push({ resolve })
            })
        }))

        let first: Promise<string> | undefined
        let second: Promise<string> | undefined

        await act(async () => {
            first = hook.current()
            second = hook.current()
            await nextTick()
        })

        expect(hook.current.loading).toBe(true)

        await act(async () => {
            pending[1]?.resolve("second")
            await second
        })

        expect(hook.current.loading).toBe(false)
        expect(hook.current.data).toBe("second")

        await act(async () => {
            pending[0]?.resolve("first")
            await first
        })

        expect(hook.current.loading).toBe(false)
        expect(hook.current.data).toBe("second")
        hook.unmount()
    })
})
