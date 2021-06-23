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


  const c = Object.assign(client, {
    items,
    loading,
    error,
    has_more,
    empty: !error && Object.keys(items).length == 0 && !loading,
    filters: options?.filters
  })

  return c as Omit<typeof c, "lift" | "source" | "subscribe" | "operator" | "pipe" | "toPromise" | "forEach">
}
