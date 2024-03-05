"use client"

import { useEffect, useMemo } from "react"
import { useLiveQueryContext } from "./LiveQueryContext.js"
import { useObservable } from "./useObservable.js"
import { LivequeryBaseEntity, QueryOption } from "@livequery/types"
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


  if (typeof window == 'undefined') {
    return {
      $changes: new Subject(),
      add: (() => { }) as any,
      empty: false,
      filter: (() => { }) as any,
      fetch_more: (() => { }) as any,
      filters: {},
      has_more: false,
      items: [],
      reload: (() => { }) as any,
      reset: (() => { }) as any,
      trigger: (() => { }) as any,
      update: (() => { }) as any,
      loading: false
    } as CollectionData<T>
  }

  const { transporter } = useLiveQueryContext();
  const client = useMemo(() => new CollectionObservable(ref, { transporter, ...collection_options }), [ref]);
  const stream = useObservable(client, {
    filters: {},
    items: [],
    has_more: false,
    loading: collection_options.lazy ? false : true,
    error: undefined
  });
  const { loading, has_more, items, error } = stream;
  useEffect(() => {
    try {
      ref && !collection_options?.lazy && client?.fetch_more();
    } catch (e) {
    }
  }, [ref]);

  useEffect(() => {
    collection_options.load_all && !loading && has_more && items.length > 0 && client?.fetch_more();
  }, [loading]);

  const empty = !!(ref && !error && items.length == 0 && !loading)

  const result: CollectionData<T> = {
    ...stream,
    loading: !!stream.loading,
    empty,
    add: assert(client?.add, client),
    fetch_more: assert(client?.fetch_more, client),
    filter: assert(client?.filter, client),
    reload: assert(client?.reload, client),
    reset: assert(client?.reset, client),
    trigger: assert(client?.trigger, client),
    update: assert(client?.update, client),
    $changes: client?.$changes
  }

  return result
}
