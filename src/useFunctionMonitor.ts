import { useState } from "react"

export const useFunctionMonitor = <T extends Function>(fn: T) => {
    const [{ error, data, loading }, update] = useState<{ error?: any, data?: AnalyserNode, loading?: boolean }>({})

    const excute = (async (...args: any[]) => {
        update({ data: null, loading: true, error: null })
        try {
            update({ data: await fn(...args), error: null, loading: false })
        } catch (error) {
            update({ data: null, error, loading: false })
        }
    }) as any as T

    return { excute, loading, data, error }
}