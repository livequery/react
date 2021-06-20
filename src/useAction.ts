import { useState } from "react"



export const useAction = <T extends Function>(fn: T) => {
    const [{ data, error, loading }, update] = useState<Partial<{ data: any, error: any, loading: boolean }>>({})
    const excute = async (...args) => {
        try {
            update({ data: null, loading: true, error: null })
            const data = await fn(...args)
            update({ data, loading: false, error: null })
        } catch (error) {
            update({ data: null, loading: false, error })
        }
    }
    return { data, error, loading, excute }
}