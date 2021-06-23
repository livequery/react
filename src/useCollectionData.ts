import { useEffect, useMemo } from "react"
import { useLiveQueryContext } from "./LiveQueryContext"
import { CollectionObservable, CollectionOption } from '@livequery/client'
import { useObservable } from "./useObservable"
import { QueryOption } from "../../types/build"
import { Observable } from "rxjs"

export type useCollectionDataOptions<T = any> = CollectionOption<T> & {
  lazy: boolean,
  filters: Partial<QueryOption<T>>;
}

export const useCollectionData = <T extends { id: string }>(ref: string, collection_options: Partial<useCollectionDataOptions<T>> = {}) => {

  const transporter = useLiveQueryContext().transporter

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
    empty: !error && Object.keys(items).length == 0 && !loading,
    filters: options?.filters,
    add: client.add.bind(client) as typeof client.add,
    fetch_more: client.fetch_more.bind(client) as typeof client.fetch_more,
    filter: client.filter.bind(client) as typeof client.filter,
    reload: client.reload.bind(client) as typeof client.reload,
    reset: client.reset.bind(client) as typeof client.reset,
    trigger: client.trigger.bind(client) as typeof client.trigger,
    update: client.update.bind(client) as typeof client.update,
  }
}
