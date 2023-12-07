"use client"

import { useEffect, useMemo } from "react"
import { useLiveQueryContext } from "./LiveQueryContext"
import { useObservable } from "./useObservable"
import { LivequeryBaseEntity, QueryOption } from "@livequery/types"
import { CollectionObservable, CollectionOption } from "@livequery/client"

export type useCollectionDataOptions<T extends LivequeryBaseEntity = LivequeryBaseEntity> = CollectionOption<T> & {
  lazy?: boolean,
  filters: Partial<QueryOption<T>>;
  load_all: boolean
}

function assert<T extends Function>(fn: T | undefined, thiss: any) {
  return (fn || (() => { })).bind(thiss) as T
}

export const useCollectionData = <T extends { id: string }>(ref: string | undefined | '' | null | false, collection_options: Partial<useCollectionDataOptions<T>> = {}) => {
  const { transporter } = useLiveQueryContext();
  const client = useMemo(() => new CollectionObservable(ref, { transporter, ...collection_options }), [ref]);
  const stream = useObservable(client, {
    options: {},
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

  return {
    ...stream,
    filters: stream.options,
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
}
