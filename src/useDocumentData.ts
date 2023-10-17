"use client"

import { CollectionOption } from "@livequery/client"
import { useCollectionData } from "./useCollectionData"
import { LivequeryBaseEntity } from "@livequery/types"

export type useDocumentDataOptions<T extends LivequeryBaseEntity = LivequeryBaseEntity> = Omit<CollectionOption<T>, 'filters'> & {
    lazy?: boolean
}

export const useDocumentData = <T extends { id: string }>(ref: string | undefined | '' | null | false, options?: useDocumentDataOptions) => {

    const { items, loading, error, reload, $changes } = useCollectionData<T>(ref, options)

    return {
        item: items[0],
        loading,
        error,
        reload,
        $changes
    }

}