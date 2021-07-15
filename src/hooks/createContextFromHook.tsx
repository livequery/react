import React, { PropsWithChildren } from 'react'
import { createContext, useContext } from "react"

export const createContextFromHook = <T, K>(fn: (props?: T) => K) => {
    const context = createContext<K>({} as K)
    const getContext = () => useContext(context)
    const Provider = ({ children, ...value }: PropsWithChildren<K>) => (
        <context.Provider value={value as K}>
            {children}
        </context.Provider>
    )
    return [fn, getContext, Provider] as [typeof fn, typeof getContext, typeof Provider]
}