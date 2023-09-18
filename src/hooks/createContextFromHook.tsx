"use client"

import React, { PropsWithChildren } from 'react'
import { createContext, useContext } from "react"

export const createContextFromHook = <T, K>(fn: (props?: T) => K) => {

    const context = createContext<K>({} as K)
    const getContext = () => useContext(context)

    const Provider = ({ children, ...props }: PropsWithChildren<T>) => {
        const value = fn(props as T)
        return (
            <context.Provider value={value}>
                {children}
            </context.Provider>
        )
    }
    return [getContext, Provider] as [typeof getContext, typeof Provider]
}