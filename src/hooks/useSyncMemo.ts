import { useEffect, useRef } from "react"



export const useSyncMemo = <T>(fn: () => [value: T, cleaner: () => void], deps: any[]) => {
    const ref = useRef({ value: undefined as T, deps: [] as any[], n: 0, cleaner: () => { } })
    const outdated = ref.current.n == 0 || deps.some((e, i) => e != ref.current.deps[i])
    const [value, cleaner] = outdated ? (ref.current.cleaner(), fn()) : [
        ref.current.value,
        () => { }
    ]
    ref.current = { deps, value, n: ref.current.n + 1, cleaner }
    return value
}