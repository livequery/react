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

export const useCollectionData = <T extends { id: string }>(ref: string | undefined | '' | null | false, collection_options: Partial<useCollectionDataOptions<T>> = {}) => {
  const { transporter } = useLiveQueryContext();
  const client = useMemo(() => new CollectionObservable(ref, { transporter, ...collection_options }), [ref]);
  const stream = useObservable(client, { options: {}, items: [], has_more: false, loading: false, error: undefined });
  const { loading, has_more, items } = stream;
  useEffect(() => {
    try {
      ref && !collection_options?.lazy && client?.fetch_more();
    }
    catch (e) {
    }
  }, [ref]);
  useEffect(() => {
    collection_options.load_all && !loading && has_more && items.length > 0 && client?.fetch_more();
  }, [loading]);
  return Object.assign(client, stream, {
    empty: ref && !stream.error && stream.items.length == 0 && !stream.loading
  })
}
