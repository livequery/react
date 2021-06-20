
import { useCollectionData } from "./useCollectionData"

export const useDocumentData = <T extends { id: string }>(ref: string) => {

    const { items, loading, error, reload, update, remove } = useCollectionData<T>(ref) 

    return {
        item: items[0],
        loading,
        error,
        reload,
        update,
        remove
    }

}