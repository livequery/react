import { useMemo } from "react"

const WindowGlobalKey = Symbol.for('#livequery/react/global')

/**
 * Resolves a process-wide singleton value stored on `globalThis`.
 *
 * The resolver runs only the first time a given key is requested in the current runtime.
 * Later calls with the same key return the cached value.
 *
 * @param key Unique key within the package global registry.
 * @param resolver Lazy factory used when the value does not exist yet.
 * @returns The cached or newly created value.
 */
export const useGlobalValue = <T>(key: string, resolver: () => T) => {
    const G = globalThis as any
    G[WindowGlobalKey] = G[WindowGlobalKey] || {}
    G[WindowGlobalKey]![key] = G[WindowGlobalKey]![key] || resolver()
    return G[WindowGlobalKey]![key] as T
}