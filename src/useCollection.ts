import { LivequeryCollection, type Doc, type LivequeryCollectionOptions } from "@livequery/client"
import { useMemo, useEffect } from "react"
import { useLivequeryClient } from "./LivequeryClientContext.js"



export const useCollection = <T extends Doc>(ref: string | undefined | '' | null | false, options: Partial<LivequeryCollectionOptions<T>> = {}) => {
    const client = useLivequeryClient()
    // Recreate the collection whenever the ref changes so each ref gets a fresh, fully-reset
    // instance. The client is stable (provided once via context), so it is intentionally NOT a
    // dependency — keying on it would rebuild the collection on every render if a caller ever
    // passed an unstable client.
    const collection = useMemo(() => new LivequeryCollection<T>(client, options), [ref])
    console.log({ref})
    useEffect(() => {
        console.log({ref})
        if (!client || !ref) return
        console.log(`Initializing collection for ref: ${ref}`)
        const linker = collection.initialize(ref)
        return () => {
            linker?.unsubscribe()
        }
    }, [collection])
    return collection
}