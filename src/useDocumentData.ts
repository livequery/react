"use client"

import { useEffect, useMemo, useState } from "react"
import { CollectionData, CollectionMap, useCollectionData, useCollectionDataOptions } from "./useCollectionData.js"
import { LivequeryBaseEntity } from "@livequery/types"
import { SmartQueryItem } from "@livequery/client"
import { filter, tap } from "rxjs"

export type useDocumentDataOptions<T extends LivequeryBaseEntity = LivequeryBaseEntity> = Partial<Omit<useCollectionDataOptions<T>, 'filters'>>

export const useDocumentData = <T extends LivequeryBaseEntity>(ref: string | undefined | '' | null | false, config: useDocumentDataOptions<T> = {}) => {



    const [old, set_old] = useState((() => {
        if (!ref) return
        const id = ref.split('/').pop()
        const collection_ref = ref.split('/').slice(0, -1).join('/')
        const collection = CollectionMap.get(collection_ref) as any as CollectionData<T>
        if (!collection) return
        const item = collection.items.find(item => item.id == id) as SmartQueryItem<T>
        if (!item) return
        return { collection, item }
    })())


    useEffect(() => {
        if (!old || !old.item || !ref) return
        const s = old.collection.$changes.pipe(
            filter(id => id.data.id == old.item.id),
            tap(d => set_old({ ...old, item: { ...old.item, ...d.data } }))
        ).subscribe()
        return () => s.unsubscribe()
    }, [ref])

    const { items, loading, error, $changes } = useCollectionData<T>(old ? null : ref, config)

    if (old && old.item) {
        return {
            item: old.item,
            error: null,
            loading: false,
            $changes: old.collection.$changes
        }
    }

    return {
        item: items[0],
        loading,
        error,
        $changes
    }

}