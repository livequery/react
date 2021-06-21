
import { useCollectionData } from "./useCollectionData"

export const useDocumentData = <T extends { id: string }>(ref: string) => {

    const { items, loading, error, reload } = useCollectionData<T>(ref)

    return {
        item: items[0],
        loading,
        error,
        reload
    }

}