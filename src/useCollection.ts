import { LivequeryCollection, type Doc, type LivequeryCollectionOptions } from "@livequery/client"
import { useMemo, useEffect } from "react"
import { useLivequeryClient, useLivequeryContext } from "./LivequeryClientContext.js"



export const useCollection = <T extends Doc>(ref: string | undefined | '' | null | false, options: Partial<LivequeryCollectionOptions<T>> = {}) => {
    const client = useLivequeryClient()
    // Provider-level context (e.g. { account_id }); a per-call options.context overrides it.
    const providerContext = useLivequeryContext()
    const context = { ...providerContext, ...options.context }
    const contextKey = JSON.stringify(context)
    // Recreate the collection whenever the ref OR the context changes so each (ref, context)
    // pair gets a fresh, fully-reset instance — switching account re-subscribes under the new
    // context. The client is stable (provided once via context), so it is intentionally NOT a
    // dependency — keying on it would rebuild the collection on every render if a caller ever
    // passed an unstable client.
    const collection = useMemo(() => new LivequeryCollection<T>(client, { ...options, context }), [ref, contextKey])
    useEffect(() => {
        if (!client || !ref) return
        const linker = collection.initialize(ref)
        return () => {
            linker?.unsubscribe()
        }
    }, [collection])
    return collection
}