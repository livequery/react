"use client"


import { useState } from "react"

type PromiseType<T> = T extends PromiseLike<infer U> ? U : T

export const useMonitor = <T extends (...args: any) => any>(fn: T) => {
    const [{ error, data, loading }, update] = useState<{ error?: any, data?: PromiseType<ReturnType<T>>, loading?: boolean }>({})

    const excute = (async (...args: any[]) => {
        update({ data: null, loading: true, error: null })
        try {
            update({ data: await fn(...args), error: null, loading: false })
        } catch (error) {
            update({ data: null, error, loading: false })
        }
    }) as any as T

    const vaild = !error && !loading

    return { excute, loading, data, error, vaild }
}
