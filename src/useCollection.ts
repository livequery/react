import { LivequeryCollection, LivequeryCore, type Doc, type LivequeryCollectionOptions } from "@livequery/core"
import { useMemo, useEffect } from "react"
import { createContextFromHook } from "./createContextFromHook"

const livequeryCoreContext = createContextFromHook(
    (props: { core: LivequeryCore }) => props.core
)

/**
 * Returns the `LivequeryCore` instance from the nearest provider.
 */
export const useLivequeryCore = livequeryCoreContext[0]

/**
 * Provides a `LivequeryCore` instance to all descendants that use this package's hooks.
 */
export const LivequeryCoreProvider = livequeryCoreContext[1]

/**
 * Creates and initializes a `LivequeryCollection` for the supplied collection path.
 *
 * The collection instance is stable for the lifetime of the component. Initialization is
 * skipped when `ref` is falsy.
 *
 * @param ref Collection path understood by `@livequery/core`.
 * @param options Collection options forwarded to `LivequeryCollection`.
 * @returns A stable `LivequeryCollection` instance.
 */
export const useCollection = <T extends Doc>(ref: string | undefined | '' | null | false, options: Partial<LivequeryCollectionOptions<T>> = {}) => {
    const core = useLivequeryCore()
    const collection = useMemo(() => new LivequeryCollection<T>(options), [])
    useEffect(() => {
        if (!ref || !core) return
        const linker = collection.initialize(core, ref)
        return () => {
            linker?.unsubscribe()
        }
    }, [collection, core, ref])

    return collection
}