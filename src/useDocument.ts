import { type Doc, type LivequeryCollectionOptions } from "@livequery/client"
import { useObservable } from "./useObservable.js"
import { useCollection } from "./useCollection.js"


export const useDocument = <T extends Doc>(ref: string | undefined | '' | null | false, options: Pick<Partial<LivequeryCollectionOptions<T>>, 'lazy' | 'mode' | 'seed' | 'ssr'> = {}) => {
    const collection = useCollection<T>(ref, options)
    const items = useObservable(collection.items)
    const loading = useObservable(collection.loading)
    const error = useObservable(collection.error)
    return [items[0], loading, error] as const
}