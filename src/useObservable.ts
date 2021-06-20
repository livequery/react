import { useEffect, useState } from 'react'
import { Observable } from 'rxjs'

export const useObservable = <T>(o: Observable<T>, default_value: T) => {

    let mounting = true

    const [s, ss] = useState<T>(default_value)

    useEffect(() => {

        const subcription = o.subscribe(d => {
            ss({...d})
            console.log(d)
            // setInterval(() => ss({items: [], options:{}} as any ), 500)
            // mounting && ss(d)
        })

        return () => {
            subcription.unsubscribe()
            mounting = false
        }
    }, [o])

    return s
}