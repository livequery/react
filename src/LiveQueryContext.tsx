"use client"


import { Transporter } from '@livequery/types'
import { createContextFromHook } from './hooks/createContextFromHook.js'


export type LiveQueryContextOption = {
  transporter: Transporter
}


export const [useLiveQueryContext, LiveQueryContextProvider] = createContextFromHook((props: LiveQueryContextOption) => props)