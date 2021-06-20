import { useEffect } from "react"

export const useMountState = () => {
    let mounting = true
    useEffect(() => () => { mounting = false }, [])
    return mounting
}