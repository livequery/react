
import { Transporter } from '@livequery/types'
import { createContextFromHook } from './hooks/createContextFromHook'


export type LiveQueryContextOption = {
  transporter: Transporter
}


export const [useLiveQuery, useLiveQueryContext, LiveQueryContextProvider] = createContextFromHook((props: LiveQueryContextOption) => props)