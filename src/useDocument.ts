import { LivequeryCollection, type Doc } from "@livequery/core"
import { useMemo, useEffect } from "react"
import { useLivequeryCore } from "./useCollection"
import { useObservable } from "./useObservable"

/**
 * Subscribes to a single document path and returns the first emitted item with loading state.
 *
 * Internally this hook creates a `LivequeryCollection`, initializes it with the document ref,
 * then reads the first item from the collection stream.
 *
 * @param ref Document path understood by `@livequery/core`.
 * @param options Collection options used when creating the backing collection.
 * @returns A tuple of `[document, loading]`.
 */
export const useDocument = <T extends Doc>(ref: string | undefined | '' | null | false, options: { lazy?: boolean } = {}) => {
    const core = useLivequeryCore()

    const collection = useMemo(() => new LivequeryCollection<T>(options), [])
    useEffect(() => {
        if (!ref || !core) return
        const linker = collection.initialize(core, ref)
        return () => {
            linker?.unsubscribe()
        }
    }, [collection, core, ref])

    const items = useObservable(collection.items)
    const loading = useObservable(collection.loading)
    return [items[0], loading] as const
    // const doc: LivequeryDocument<T> | null = items[0] || of(null)
    // return Object.assign(doc, {
    //     loading,
    //     del: () => id && collection.delete(id)
    // })

}