"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLiveQueryContext } from "./LiveQueryContext.js"
import { DocumentResponse, LivequeryBaseEntity, QueryOption, UpdatedData } from "@livequery/types"
import { CollectionObservable, CollectionOption, CollectionStream } from "@livequery/client"
import { Subject } from 'rxjs'
import { useSyncMemo } from "./hooks/useSyncMemo.js"


export type useCollectionDataOptions<T extends LivequeryBaseEntity = LivequeryBaseEntity> = CollectionOption<T> & {
  lazy?: boolean,
  filters: Partial<QueryOption<T>>;
  load_all: boolean
}

export type CollectionData<T extends LivequeryBaseEntity> = (
  CollectionStream<T>
  & Pick<CollectionObservable<T>, 'add' | 'fetch_more' | 'filter' | 'reload' | 'reset' | 'trigger' | 'update' | '$changes'>
  & { empty: boolean, loaded: boolean }
)

function assert<T extends Function>(fn: T | undefined, thiss: any) {
  return (fn || (() => { })).bind(thiss) as T
}

export type CollectionRef = string | undefined | '' | null | false

export const useCollectionData = <T extends LivequeryBaseEntity>(ref: CollectionRef, collection_options: Partial<useCollectionDataOptions<T>> & { vkl?: any } = {}) => {


  const { transporter } = useLiveQueryContext();

  const n = useRef(0)

  const lazy = collection_options.lazy




  const [stream, set_stream] = useState<CollectionStream<T> & { loaded: boolean, n: number }>({
    filters: {},
    has_more: false,
    items: [],
    loaded: false,
    n: 0
  })


  const client = useSyncMemo(() => {

    const client = new CollectionObservable(ref, { transporter, ...collection_options })
    n.current = 0

    const subscription = client.subscribe(data => {
      if (collection_options.load_all && data.has_more) {
        client.fetch_more()
      } else {
        n.current++
        set_stream({ ...data, loaded: true, n: n.current })
      }
    });
    if (!lazy) {
      client.fetch_more()
    }

    return [client, () => subscription.unsubscribe()]

  }, [ref])


  const empty = !client.value.loading && client.value.items.length == 0 && stream.loaded

  const result: CollectionData<T> = {
    ...stream,
    error: stream.error,
    loading: !!stream.loading || (!collection_options?.lazy && !!ref && n.current == 0),
    empty,
    add: assert(client?.add, client),
    fetch_more: assert(client?.fetch_more, client),
    filter: assert(client?.filter, client),
    reload: assert(client?.reload, client),
    reset: assert(client?.reset, client),
    trigger: assert(client?.trigger, client),
    update: assert(client?.update, client),
    $changes: client?.$changes || new Subject<UpdatedData<T>>(),
  }

  return result

}
