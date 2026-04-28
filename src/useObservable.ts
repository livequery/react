import { useEffect, useState } from "react";
import { Observable, BehaviorSubject, tap, EMPTY } from "rxjs";
import { skip } from "rxjs/operators";

export type MaybeFunction<T> = T | (() => T)

export const useObservable = <T extends any, R = undefined>(o: MaybeFunction<BehaviorSubject<T> | Observable<T>> | undefined, default_value?: R) => {
    const getValue = (o as any)?.getValue
    const [v, s] = useState<T | R>(getValue ? getValue() as T : default_value as R)
    useEffect(() => {
        try {
            const target = (typeof o === 'function' ? o() : (o || EMPTY))
            const subscription = target.pipe(
                skip(getValue ? 1 : 0),
                tap(value => {
                    s(value)
                })
            ).subscribe()
            return () => {
                subscription.unsubscribe()
            }
        } catch (e) { }
    }, typeof o === 'function' ? [] : [o])
    return v
}