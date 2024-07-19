"use client"

import { useCollectionData, useCollectionDataOptions } from "./useCollectionData.js"
import { LivequeryBaseEntity } from "@livequery/types"

export type useDocumentDataOptions<T extends LivequeryBaseEntity = LivequeryBaseEntity> = Partial<Omit<useCollectionDataOptions<T>, 'filters'>> 

export const useDocumentData = <T extends LivequeryBaseEntity>(ref: string | undefined | '' | null | false, config: useDocumentDataOptions<T> = {}) => {

    const { items, loading, error, $changes } = useCollectionData<T>(ref, config)

    return {
        item: items[0],
        loading,
        error, 
        $changes
    }

}