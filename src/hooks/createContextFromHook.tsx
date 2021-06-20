import React from 'react'
import { createContext, PropsWithChildren, useContext } from "react"

export const createContextFromHook = <T, K>(fn: (props: T) => K) => {
    const context = createContext<K>({} as K)
    return [
        () => useContext(context),
        (props: PropsWithChildren<T>) => <context.Provider value={fn(props)}>{props.children}</context.Provider>
    ] as [() => K, (props: PropsWithChildren<T>) => JSX.Element]
}