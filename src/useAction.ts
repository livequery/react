import { useState } from "react"

export const useAction = <T extends (...args: any[]) => Promise<any>>(fn: T, options: Partial<{ onError: Function }> = {}) => {
    const [state, set_state] = useState<{
        loading: boolean,
        data?: Awaited<ReturnType<T>>
        error?: { code: string, message: string }
    }>({ loading: false })

    const f = async (...args: any) => {
        set_state({ loading: true })
        try {
            const data = await fn(...args)
            set_state({ loading: false, data })
            return data
        } catch (error) {
            options.onError?.(error)
            set_state({ loading: false, error: error instanceof Error ? { code: 'error', message: error.message } : { code: 'error', message: String(error) } })
        }
    }
    return Object.assign(f as T, state)
} 