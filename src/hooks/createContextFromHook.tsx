import React, { PropsWithChildren, ReactNode } from 'react'
import { createContext, useContext } from "react"

export const createContextFromHook = <T, K>(fn: (props?: T) => K) => {
    const context = createContext<K>({} as K)
    const getContext = () => useContext(context)
    const hook = (props?: T) => {
        const value = fn(props)
        const Provider = ({ children }: PropsWithChildren<{}>) => (
            <context.Provider value={value}>
                {children}
            </context.Provider>
        )
        return [Provider, value] as [typeof Provider, K]
    }
    return [hook, getContext] as [typeof hook, typeof getContext]
}