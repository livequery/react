import { LivequeryCollection, type Doc, type LivequeryCollectionOptions } from "@livequery/core"
import { useMemo, useEffect } from "react"
import { useLivequeryCore } from "./LivequeryCoreContext.js"



export const useCollection = <T extends Doc>(ref: string | undefined | '' | null | false, options: Partial<LivequeryCollectionOptions<T>> = {}) => {
    const core = useLivequeryCore()
    const collection = useMemo(() => new LivequeryCollection<T>(core, options), [])
    useEffect(() => {
        if (!ref || !core) return
        const linker = collection.initialize(ref)
        return () => {
            linker?.unsubscribe()
        }
    }, [collection, core, ref])
    return collection
}