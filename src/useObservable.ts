"use client"


import { useEffect, useState } from 'react'
import { Observable } from 'rxjs'

export const useObservable = <T>(o: Observable<T> | null) => {


    const [s, ss] = useState<T>()

    useEffect(() => {
        if (o) {
            const subcription = o.subscribe(d => ss(d))
            return () => {
                subcription.unsubscribe()
            }
        }

    }, [o])

    return s
}