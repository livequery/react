"use client"

import { useEffect, useMemo, useState } from "react"
import { useLivequeryContext } from "./LiveQueryContext.js"
import { LivequeryBaseEntity, QueryOption, UpdatedData } from "@livequery/types"
import { CollectionObservable, CollectionOption, CollectionStream } from "@livequery/client"
import { Subject } from 'rxjs'


export type useCollectionDataOptions<T extends LivequeryBaseEntity = LivequeryBaseEntity> = CollectionOption<T> & {
  lazy?: boolean,
  options: Partial<QueryOption<T>>;
  load_all: boolean
}

export type CollectionRef = string | undefined | '' | null | false

export type CollectionData<T extends LivequeryBaseEntity> = (
  CollectionStream<T>
  & Pick<CollectionObservable<T>, 'add' | 'fetch_more' | 'fetch_prev' | 'reset' | 'trigger' | 'update' | '$changes' | 'filter'>
  & {
    empty: boolean,
    ref: CollectionRef,
    filters: CollectionStream<T>['options']
  }
)

function assert<T extends Function>(fn: T | undefined, thiss: any) {
  return (fn || (() => { })).bind(thiss) as T
}

export const CollectionMap = new Map<string, CollectionData<any>>()


export const useCollectionData = <T extends LivequeryBaseEntity>(ref: CollectionRef, collection_options: Partial<useCollectionDataOptions<T>> = {}) => {

  const { transporter } = useLivequeryContext()
  if (!transporter) throw 'MISSING_LIVEQUERY_TRANSPORTER'

  const client = useMemo(() => new CollectionObservable(ref, {
    ...collection_options,
    transporter
  }
  ), [ref])

  const [$, set_$] = useState<CollectionStream<T>>(client.getValue())

  const [state, set_state] = useState(0)

  // Sync stream effect
  useEffect(() => {
    if (collection_options.lazy) return
    client.fetch_more()
    const s = client.subscribe(data => {
      if (collection_options.load_all && data.paging.has?.next) {
        client.fetch_more()
      } else {
        set_$(data)
        set_state(Date.now())
      }
    })
    return () => {
      s.unsubscribe()
    }
  }, [client, set_$, collection_options.lazy, set_state])

  const empty = !!(!$.loading && $.items.length == 0)


  const result: CollectionData<T> & { state: number } = {
    ...$,
    state,
    empty,
    filters: $.options,
    add: assert(client?.add, client),
    fetch_more: assert(client?.fetch_more, client),
    fetch_prev: assert(client?.fetch_prev, client),
    filter: assert(client?.filter, client),
    reset: assert(client?.reset, client),
    trigger: assert(client?.trigger, client),
    update: assert(client?.update, client),
    $changes: client?.$changes || new Subject<UpdatedData<T>>(),
    ref
  }

  useEffect(() => {
    ref && CollectionMap.set(ref, result as any as CollectionData<any>)
    return () => { ref && CollectionMap.delete(ref) }
  }, [client])

  return result

}
