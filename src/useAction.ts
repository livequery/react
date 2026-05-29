import { useRef, useState } from "react"

export const useAction = <T extends (...args: any[]) => Promise<any>>(fn: T, options: Partial<{ onError: Function }> = {}) => {
    const requestId = useRef(0)
    const [state, set_state] = useState<{
        loading: boolean,
        data?: Awaited<ReturnType<T>>
        error?: { code: string, message: string }
    }>({ loading: false })

    const f = async (...args: any) => {
        const currentRequestId = ++requestId.current
        set_state({ loading: true })
        try {
            const data = await fn(...args)
            if (currentRequestId === requestId.current) {
                set_state({ loading: false, data })
            }
            return data
        } catch (error) {
            options.onError?.(error)
            if (currentRequestId === requestId.current) {
                const code = (error as any)?.code ?? 'error'
                const message = error instanceof Error ? error.message : ((error as any)?.message ?? String(error))
                set_state({ loading: false, error: { code, message } })
            }
        }
    }
    return Object.assign(f as T, state)
} 
