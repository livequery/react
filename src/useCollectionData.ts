import { useEffect, useMemo } from "react"
import { useLiveQueryContext } from "./LiveQueryContext"
import { useObservable } from "./useObservable"
import { QueryOption } from "../../types/build"
import { CollectionObservable, CollectionOption } from "@livequery/client"

export type useCollectionDataOptions<T = any> = CollectionOption<T> & {
  lazy?: boolean,
  filters: Partial<QueryOption<T>>;
}

function assert<T extends Function>(fn: T, thiss: any) {
  return (fn || (() => { })).bind(thiss) as T
}

export const useCollectionData = <T extends { id: string }>(ref: string, collection_options: Partial<useCollectionDataOptions<T>> = {}) => {

  const { transporter } = useLiveQueryContext()
  const client = useMemo(() => ref && new CollectionObservable<T>(ref, { transporter, ...collection_options }), [ref])
  const { loading, has_more, error, items, options } = useObservable(client, { options: {}, items: [], has_more: false })

  useEffect(() => {
    ref && !collection_options?.lazy && client.fetch_more()
  }, [ref])

  return {
    items,
    loading,
    error,
    has_more,
    empty: ref && !error && Object.keys(items).length == 0 && !loading,
    filters: (options || {}) as typeof options,
    add: assert(client?.add, client),
    fetch_more: assert(client?.fetch_more, client),
    filter: assert(client?.filter, client),
    reload: assert(client?.reload, client),
    reset: assert(client?.reset, client),
    trigger: assert(client?.trigger, client),
    update: assert(client?.update, client),
  }
}
