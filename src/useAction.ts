import { useState } from "react"

export const useAction = <T extends (...args: any[]) => Promise<any>>(fn: T, options: Partial<{ onError: Function }> = {}) => {
    const [state, set_state] = useState({
        loading: false,
        data: null,
        error: null as null | { code: string, message: string }
    })
    const f = async (...args: any) => {
        set_state({ loading: true, data: null, error: null })
        try {
            const data = await fn(...args)
            set_state({ loading: false, data, error: null })
            return data
        } catch (error) {
            options.onError?.(error)
            set_state({ loading: false, data: null, error: error instanceof Error ? { code: 'error', message: error.message } : { code: 'error', message: String(error) } })
        }
    }
    return Object.assign(f as T, state)
}
