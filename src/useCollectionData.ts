"use client"

import { useEffect, useMemo } from "react"
import { useLiveQueryContext } from "./LiveQueryContext"
import { useObservable } from "./useObservable"
import { LivequeryBaseEntity, QueryOption, Transporter } from "@livequery/types"
import { CollectionObservable, CollectionOption, SmartQueryItem } from "@livequery/client"
import { Subject } from 'rxjs'

export type useCollectionDataOptions<T extends LivequeryBaseEntity = LivequeryBaseEntity> = CollectionOption<T> & {
  lazy?: boolean,
  filters: Partial<QueryOption<T>>;
  load_all: boolean
}

function assert<T extends Function>(fn: T | undefined, thiss: any) {
  return (fn || (() => { })).bind(thiss) as T
}

export const useCollectionData = <T extends { id: string }>(ref: string | undefined | '' | null | 0 | false, collection_options: Partial<useCollectionDataOptions<T>> = {}) => {
  const lqct = useLiveQueryContext()
  const transporter = lqct as any 
  const client = useMemo(() => ref ? new CollectionObservable<T>(ref, { transporter, ...collection_options }) : null, [ref])
  const data = useObservable(client) || { options: {}, items: [] as SmartQueryItem<T>[], has_more: false, loading: false, error: null }
  const { loading, has_more, error, items, options } = data
  useEffect(() => {
    try {
      ref && !collection_options?.lazy && client?.fetch_more()
    } catch (e) {
    }
  }, [ref])

  useEffect(() => {
    // collection_options.load_all && !loading && has_more && items.length > 0 && client.fetch_more()
  }, [loading])

  return {
    items,
    loading,
    error,
    has_more,
    empty: ref && !error && items.length == 0 && loading === false,
    filters: (options || {}) as typeof options,

    add: assert(client?.add, client),
    fetch_more: () => {
      alert('Fetch more')
    },
    filter: assert(client?.filter, client),
    reload: assert(client?.reload, client),
    reset: assert(client?.reset, client),
    trigger: assert(client?.trigger, client),
    update: assert(client?.update, client),
    $changes: client?.$changes || new Subject()
  }
}
