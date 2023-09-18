"use client"


import { useEffect, useState } from 'react'
import { Observable } from 'rxjs'

export const useObservable = <T>(o: Observable<T> | null, default_value: T) => {

    let mounting = true

    const [s, ss] = useState<T>(default_value)

    useEffect(() => {

        if (!o) return

        const subcription = o?.subscribe(d => ss({ ...d }))

        return () => {
            subcription?.unsubscribe()
            mounting = false
        }
    }, [o])

    return s
}