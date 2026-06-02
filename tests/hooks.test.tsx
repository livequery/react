/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test"
import React, { act } from "react"
import { create, type ReactTestRenderer } from "react-test-renderer"
import { createContextFromHook } from "../src/createContextFromHook.js"
import { useAction } from "../src/useAction.js"

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

    test("preserves error code from thrown object", async () => {
        const hook = renderHook(() => useAction(async () => {
            throw { code: 'VALIDATION_ERROR', message: 'Invalid input' }
        }))

        await act(async () => {
            await hook.current().catch(() => { })
        })

        expect(hook.current.error?.code).toBe('VALIDATION_ERROR')
        expect(hook.current.error?.message).toBe('Invalid input')
        hook.unmount()
    })

    test("uses code from Error object when present", async () => {
        const hook = renderHook(() => useAction(async () => {
            const e = new Error('Something failed') as any
            e.code = 'SERVER_ERROR'
            throw e
        }))

        await act(async () => {
            await hook.current().catch(() => { })
        })

        expect(hook.current.error?.code).toBe('SERVER_ERROR')
        expect(hook.current.error?.message).toBe('Something failed')
        hook.unmount()
    })

    test("falls back to 'error' code for plain Error without code", async () => {
        const hook = renderHook(() => useAction(async () => {
            throw new Error('plain error')
        }))

        await act(async () => {
            await hook.current().catch(() => { })
        })

        expect(hook.current.error?.code).toBe('error')
        expect(hook.current.error?.message).toBe('plain error')
        hook.unmount()
    })

    test("calls onError callback with the thrown value", async () => {
        const caught: any[] = []
        const hook = renderHook(() => useAction(
            async () => { throw { code: 'ERR', message: 'oops' } },
            { onError: (e: any) => caught.push(e) }
        ))

        await act(async () => {
            await hook.current().catch(() => { })
        })

        expect(caught).toHaveLength(1)
        expect(caught[0].code).toBe('ERR')
        hook.unmount()
    })
})
