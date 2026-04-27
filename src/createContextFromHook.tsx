import { createContext, useContext, type PropsWithChildren } from "react"

/**
 * Creates a React context pair from a hook-like factory.
 *
 * The returned tuple contains:
 * - a consumer hook that reads the computed value from context
 * - a provider component that calls `fn(props)` and places the result into context
 *
 * This pattern is useful when some shared state should feel like a normal hook at call
 * sites, while still being configured once at the edge of a subtree.
 *
 * @param fn Factory that receives provider props and returns the context value.
 * @returns A tuple of `[useValue, Provider]`.
 */
export const createContextFromHook = <T, R>(fn: ((props: T) => R) | (() => R)) => {
    const ctx = createContext<R | undefined>(undefined)

    /**
     * Reads the current context value produced by the paired provider.
     */
    const useState = () => {
        return useContext(ctx) as R
    }

    /**
     * Computes the context value from provider props and exposes it to descendants.
     */
    const Provider = ({ children, ...props }: PropsWithChildren<T>) => {
        const value = fn(props as T)
        return (
            <ctx.Provider value={value}>
                {children}
            </ctx.Provider>
        )
    }
    return [useState, Provider,] as [() => R, React.FC<PropsWithChildren<T>>]
}