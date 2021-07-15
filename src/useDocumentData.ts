
import { CollectionOption } from "@livequery/client"
import { useCollectionData } from "./useCollectionData"

export type useDocumentDataOptions<T = any> = Omit<CollectionOption<T>, 'filters'> & {
    lazy: boolean
}

export const useDocumentData = <T extends { id: string }>(ref: string, options: useDocumentDataOptions) => {

    const { items, loading, error, reload } = useCollectionData<T>(ref, options)

    return {
        item: items[0],
        loading,
        error,
        reload
    }

}