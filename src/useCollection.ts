import { LivequeryCollection, type Doc, type LivequeryCollectionOptions } from "@livequery/client"
import { useMemo, useEffect } from "react"
import { useLivequeryClient } from "./LivequeryClientContext.js"



export const useCollection = <T extends Doc>(ref: string | undefined | '' | null | false, options: Partial<LivequeryCollectionOptions<T>> = {}) => {
    const client = useLivequeryClient()
    // Recreate the collection whenever the ref (or client) changes so each ref gets a
    // fresh, fully-reset instance instead of mutating one long-lived collection in place.
    const collection = useMemo(() => new LivequeryCollection<T>(client, options), [client, ref])
    useEffect(() => {
        if (!ref || !client) return
        const linker = collection.initialize(ref)
        return () => {
            linker?.unsubscribe()
        }
    }, [collection, client, ref])
    return collection
}