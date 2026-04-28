import { LivequeryDocument, type Doc, type DocState } from "@livequery/core"
import { useObservable } from "./useObservable.js"
import { useCollection } from "./useCollection.js"


export const useDocument = <T extends Doc>(ref: string | undefined | '' | null | false, options: { lazy?: boolean } = {}) => {
    const collection = useCollection<T>(ref, { lazy: options.lazy })
    const items = useObservable(collection.items, [] as LivequeryDocument<DocState<T>>[])
    const loading = useObservable(collection.loading)
    return [items[0], loading] as const
}