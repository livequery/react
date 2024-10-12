"use client"

import { useEffect, useRef, useState } from "react"
import { useLiveQueryContext } from "./LiveQueryContext.js"
import { LivequeryBaseEntity, QueryOption, UpdatedData } from "@livequery/types"
import { CollectionObservable, CollectionOption, CollectionStream } from "@livequery/client"
import { merge, Subject } from 'rxjs'
import { useSyncMemo } from "./hooks/useSyncMemo.js"


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
    loaded: boolean,
    ref: CollectionRef,
    filters: CollectionStream<T>['options']
  }
)

function assert<T extends Function>(fn: T | undefined, thiss: any) {
  return (fn || (() => { })).bind(thiss) as T
}


export const useCollectionData = <T extends LivequeryBaseEntity>(ref: CollectionRef, collection_options: Partial<useCollectionDataOptions<T>> = {}) => {


  const { transporter } = useLiveQueryContext();

  const n = useRef(0)

  const lazy = collection_options.lazy

  const [, set_version] = useState(0)

  const client = useSyncMemo(() => {
    n.current = 0 
    const client = new CollectionObservable(ref, { transporter, ...collection_options })
    const a = client.$changes.subscribe(changes => {
      n.current++
    })

    const subscription = client.subscribe(data => {
      if (!lazy && collection_options.load_all && data.paging.has?.next) {
        client.fetch_more()
      } else {
        set_version(Math.random())
      }
    });

    return [client, () => {
      subscription.unsubscribe()
      a.unsubscribe()
    }]

  }, [ref])

  const loaded = n.current > 0
  const $ = client.$.getValue()
  const empty = loaded && !$.loading && $.items.length == 0;

  const result: CollectionData<T> = {
    ...$,
    loaded,
    empty,
    filters: $.options,
    add: assert(client?.add, client),
    fetch_more: assert(client?.fetch_more, client),
    fetch_prev: assert(client?.fetch_prev, client),
    filter: assert(client?.filter, client),
    // fetch_around_cursor: assert(client?.fetch_around_cursor, client),
    reset: assert(client?.reset, client),
    trigger: assert(client?.trigger, client),
    update: assert(client?.update, client),
    $changes: client?.$changes || new Subject<UpdatedData<T>>(),
    ref
  }

  useEffect(() => {
    !lazy && !loaded && client.fetch_more()
  }, [lazy])

  return result

}
