import { LivequeryCollection, type Doc, type LivequeryCollectionOptions } from "@livequery/client"
import { useMemo, useEffect } from "react"
import { useLivequeryClient } from "./LivequeryClientContext.js"



export const useCollection = <T extends Doc>(ref: string | undefined | '' | null | false, options: Partial<LivequeryCollectionOptions<T>> = {}) => {
    const client = useLivequeryClient()
    const collection = useMemo(() => new LivequeryCollection<T>(client, options), [])
    useEffect(() => {
        if (!ref || !client) return
        const linker = collection.initialize(ref)
        return () => {
            linker?.unsubscribe()
        }
    }, [collection, client, ref])
    return collection
}