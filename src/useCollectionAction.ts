import { useEffect, useMemo, useState } from "react"
import { useLiveQueryContext } from "./LiveQueryContext"
import {   Transporter } from "@livequery/types" 

export const useCollectionAction =  (
  ref: string,
  { transporter : custom_transporter }:   { transporter?: Transporter } = {}
) => { 
  const { transporter: context_transporter } = useLiveQueryContext()
  const transporter = custom_transporter || context_transporter
 
  const is_collection = useMemo(() => ref && ref.split('/').length % 2 != 0, [ref])

  return { 
    add: data => transporter.add(ref, data),
    update: <T extends {}>({ id, ...data }: T & { id: string }) => transporter.add(is_collection ? `${ref}/${id}` : ref, data as {}),
    remove: (id: string) => transporter.remove(is_collection ? `${ref}/${id}` : ref),
    trigger: <Query = any, Payload = any, Response = any>(name: string, query: Query, payload: Payload) => transporter.trigger<Query, Payload, Response>(ref, name, query, payload)
  }
}
