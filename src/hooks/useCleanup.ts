import { useEffect, useRef } from "react";

export function useCleanup() {

    const set = useRef<Set<Function>>(new Set())

    const register = (fn: Function) => set.current.add(fn)

    const clean = () => {
        set.current.forEach(f => f())
        set.current.clear()
    }

    return { register, clean }
}