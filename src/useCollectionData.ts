"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLiveQueryContext } from "./LiveQueryContext.js"
import { LivequeryBaseEntity, QueryOption, UpdatedData } from "@livequery/types"
import { CollectionObservable, CollectionOption, CollectionStream } from "@livequery/client"
import { Subject } from 'rxjs'


export type useCollectionDataOptions<T extends LivequeryBaseEntity = LivequeryBaseEntity> = CollectionOption<T> & {
  lazy?: boolean,
  filters: Partial<QueryOption<T>>;
  load_all: boolean
}

export type CollectionData<T extends LivequeryBaseEntity> = (
  CollectionStream<T>
  & Pick<CollectionObservable<T>, 'add' | 'fetch_more' | 'filter' | 'reload' | 'reset' | 'trigger' | 'update' | '$changes'>
  & { empty: boolean }
)

function assert<T extends Function>(fn: T | undefined, thiss: any) {
  return (fn || (() => { })).bind(thiss) as T
}

export type CollectionRef = string | undefined | '' | null | false

export const useCollectionData = <T extends LivequeryBaseEntity>(ref: CollectionRef, collection_options: Partial<useCollectionDataOptions<T>> = {}) => {


  const { transporter } = useLiveQueryContext();

  const [stream, ss] = useState<CollectionStream<T>>({
    filters: {},
    items: [],
    has_more: false,
    loading: collection_options.lazy ? false : true,
    error: undefined
  })

  const [n, sn] = useState(0)

  const collection_ref = useRef<CollectionObservable<T>>()


  useEffect(() => {
    if (!ref || typeof window == 'undefined') return

    const collection = collection_ref.current = new CollectionObservable(ref, { transporter, ...collection_options })
    const subscription = collection.subscribe(data => {
      collection_options.load_all && data.loading == false && data.has_more && collection?.fetch_more()
      ss(data)
      sn(Math.random())
    })
    !collection_options?.lazy && collection?.fetch_more()
    return () => subscription.unsubscribe()
  }, [ref])

  const client = collection_ref.current
  const empty = !!(stream.loading && stream.items.length == 0)
  const result: CollectionData<T> = {
    ...stream,
    error: stream.error,
    loading: !!stream.loading,
    empty,
    add: assert(client?.add, client),
    fetch_more: assert(client?.fetch_more, client),
    filter: assert(client?.filter, client),
    reload: assert(client?.reload, client),
    reset: assert(client?.reset, client),
    trigger: assert(client?.trigger, client),
    update: assert(client?.update, client),
    $changes: client?.$changes || new Subject<UpdatedData<T>>()
  };
  return result;
}
