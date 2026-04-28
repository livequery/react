import { createContext, useContext, type JSX, type PropsWithChildren } from "react"

 
export const createContextFromHook = <T, R>(fn: ((props: T) => R) | (() => R)) => {
    const ctx = createContext<R | undefined>(undefined)
 
    const useState = () => {
        return useContext(ctx) as R
    }
    const Provider = ({ children, ...props }: PropsWithChildren<T>) => {
        const value = fn(props as T)
        return (
            <ctx.Provider value={value}>
                {children}
            </ctx.Provider>
        )
    }
    return [useState, Provider,] as [() => R, (props: PropsWithChildren<T>) => JSX.Element]
}