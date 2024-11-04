"use client"

import React, { PropsWithChildren } from 'react'
import { createContext, useContext } from "react"
import { Transporter, TransporterHook } from '@livequery/types'
import { UnaryFunction, pipe } from 'rxjs'




export type LivequeryContext = {
  transporter?: Transporter,
  hooks?: TransporterHook[]
}


export function mergeTransporterHooks(...hooks: TransporterHook[]) {
  return hooks.reduce(
    (p, c) => (next: () => UnaryFunction<any, any>) => p(() => c(next)),
    (next: () => UnaryFunction<any, any>) => pipe(next())
  )
}

const LivequeryContext = createContext<LivequeryContext>({})


export const useLivequeryContext = () => {
  const ctx = useContext(LivequeryContext)
  if (!ctx.transporter) throw 'MISSING_LIVEQUERY_TRANSPORTER'
  return {
    transporter: ctx.transporter 
  }
}



export const LiveQueryContextProvider = (props: PropsWithChildren<LivequeryContext>) => {

  const ctx = useContext(LivequeryContext)
  const merged = mergeTransporterHooks(...props.hooks || [])
  const transporter = ctx.transporter ? ctx.transporter.hook(merged) : props.transporter?.hook(merged)


  return (
    <LivequeryContext.Provider value={{ transporter }}>
      {props.children}
    </LivequeryContext.Provider>
  )
}