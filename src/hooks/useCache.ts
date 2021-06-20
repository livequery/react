import { useState } from "react"


const storage = new Map<string, any>()
export function useCache<T>(key: string, default_value: T = null) {

    const [value, set_value] = useState<T>(storage.get(key) ?? default_value)

    function push(key: string, value: T) {
        if (!key) return
        set_value(value)
        storage.set(key, value)
    }

    return [value, push] as [T, (key: string, value: T) => void]
}